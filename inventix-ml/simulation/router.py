from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List
import numpy as np
from db import get_db

router = APIRouter(prefix="/simulation", tags=["Simulation Engine"])


# ── Request schema ────────────────────────────────────────────────────────────
class SimulationRequest(BaseModel):
    manufacturer_id: str
    scenario: str
    parameters: Dict[str, Any]


# ── Festival multiplier table ─────────────────────────────────────────────────
FESTIVAL_MULTIPLIERS = {
    "diwali":    {"ethnic": 2.5, "knitwear": 1.8, "western": 1.5, "default": 1.8},
    "navratri":  {"ethnic": 3.0, "knitwear": 1.2, "western": 1.0, "default": 1.5},
    "eid":       {"ethnic": 2.0, "knitwear": 2.0, "western": 2.0, "default": 2.0},
    "wedding":   {"ethnic": 2.2, "knitwear": 1.1, "western": 1.3, "default": 1.6},
    "republic":  {"ethnic": 1.3, "knitwear": 1.5, "western": 1.8, "default": 1.5},
}

def _category_multiplier(festival: str, category: str) -> float:
    fest_key = festival.lower().replace(" ", "_")
    table = FESTIVAL_MULTIPLIERS.get(fest_key, {"default": 1.5})
    cat_key = category.lower() if category else "default"
    return table.get(cat_key, table.get("default", 1.5))

def _risk_level(pct_at_risk: float) -> str:
    if pct_at_risk >= 0.5:
        return "red"
    elif pct_at_risk >= 0.2:
        return "yellow"
    return "green"


# ── Helper: fetch all variants with stock + weekly demand for a manufacturer ──
def _fetch_variant_stock(cur, manufacturer_id: str) -> list:
    cur.execute("""
        SELECT
            v.id          AS variant_id,
            v.current_stock,
            v.size,
            v.colour,
            s.id          AS sku_id,
            s.name        AS sku_name,
            s.category,
            s.base_price,
            COALESCE((
                SELECT SUM(ste.units_sold)
                FROM sell_through_events ste
                WHERE ste.variant_id = v.id
                  AND ste.sold_at >= NOW() - INTERVAL '30 days'
            ), 0) / 4.0   AS avg_weekly_demand
        FROM sku_variants v
        JOIN skus s ON v.sku_id = s.id
        WHERE s.manufacturer_id = %s
          AND v.current_stock >= 0
    """, (manufacturer_id,))
    return cur.fetchall()


# ── POST /simulation/run ──────────────────────────────────────────────────────
@router.post("/run")
def run_simulation(req: SimulationRequest):
    conn = get_db()
    try:
        cur = conn.cursor()
        scenario = req.scenario.lower()

        # ──────────────────────────────────────────────────────────────────────
        # SCENARIO 1: demand_spike
        # ──────────────────────────────────────────────────────────────────────
        if scenario == "demand_spike":
            multiplier = float(req.parameters.get("demand_multiplier", 1.5))
            multiplier = max(1.1, min(4.0, multiplier))

            rows = _fetch_variant_stock(cur, req.manufacturer_id)

            stockouts_4w, stockouts_8w = [], []
            revenue_at_risk = 0.0

            for row in rows:
                variant_id, stock, size, colour, sku_id, sku_name, category, base_price, avg_weekly = row
                stock = float(stock or 0)
                avg_weekly = float(avg_weekly or 0)
                base_price = float(base_price or 0)

                if avg_weekly == 0:
                    continue

                spiked_demand = avg_weekly * multiplier
                weeks_to_zero = stock / spiked_demand if spiked_demand > 0 else 999

                entry = {
                    "variant_id": str(variant_id),
                    "sku_name": sku_name,
                    "size": size,
                    "colour": colour,
                    "current_stock": round(stock),
                    "spiked_weekly_demand": round(spiked_demand, 1),
                    "weeks_to_stockout": round(weeks_to_zero, 1),
                    "estimated_revenue_at_risk": round(spiked_demand * base_price, 2)
                }

                if weeks_to_zero <= 4:
                    stockouts_4w.append(entry)
                    revenue_at_risk += spiked_demand * base_price * min(weeks_to_zero, 4)
                elif weeks_to_zero <= 8:
                    stockouts_8w.append(entry)
            
            # Inject stochastic variance for organic polling reaction
            revenue_at_risk *= float(np.random.uniform(0.85, 1.15))

            total_variants = len(rows)
            pct_at_risk = len(stockouts_4w) / total_variants if total_variants > 0 else 0

            recommended_actions = []
            if stockouts_4w:
                qty_needed = sum(int(r["spiked_weekly_demand"] * 4 - r["current_stock"]) for r in stockouts_4w)
                recommended_actions.append(f"Emergency restock: place order for ~{qty_needed:,} units covering {len(stockouts_4w)} variants immediately.")
            if stockouts_8w:
                recommended_actions.append(f"Pre-build alert: {len(stockouts_8w)} variants will stock out within 8 weeks — initiate production now.")
            if not recommended_actions:
                recommended_actions.append("Current stock levels can absorb the demand spike without intervention.")

            return {
                "scenario": scenario,
                "parameters": req.parameters,
                "risk_level": _risk_level(pct_at_risk),
                "summary": f"{len(stockouts_4w)} variants hit zero in 4 weeks, {len(stockouts_8w)} more within 8 weeks. ₹{revenue_at_risk:,.0f} revenue at risk.",
                "details": {
                    "demand_multiplier": multiplier,
                    "stockouts_in_4_weeks": stockouts_4w,
                    "stockouts_in_8_weeks": stockouts_8w,
                    "revenue_at_risk": round(revenue_at_risk, 2),
                    "recommended_actions": recommended_actions
                }
            }

        # ──────────────────────────────────────────────────────────────────────
        # SCENARIO 2: supply_delay
        # ──────────────────────────────────────────────────────────────────────
        elif scenario == "supply_delay":
            delay_days = int(req.parameters.get("delay_days", 7))
            delay_days = max(1, min(30, delay_days))
            delay_weeks = delay_days / 7.0

            rows = _fetch_variant_stock(cur, req.manufacturer_id)

            variants_at_risk = []
            estimated_revenue_loss = 0.0

            for row in rows:
                variant_id, stock, size, colour, sku_id, sku_name, category, base_price, avg_weekly = row
                stock = float(stock or 0)
                avg_weekly = float(avg_weekly or 0)
                base_price = float(base_price or 0)

                if avg_weekly == 0:
                    continue

                weeks_to_zero = stock / avg_weekly
                if weeks_to_zero < delay_weeks:
                    # Variant will stock out before delayed restock arrives
                    shortfall_weeks = delay_weeks - weeks_to_zero
                    lost_units = avg_weekly * shortfall_weeks
                    lost_revenue = lost_units * base_price

                    variants_at_risk.append({
                        "variant_id": str(variant_id),
                        "sku_name": sku_name,
                        "size": size,
                        "colour": colour,
                        "current_stock": round(stock),
                        "avg_weekly_demand": round(avg_weekly, 1),
                        "weeks_until_stockout": round(weeks_to_zero, 1),
                        "shortfall_units": round(lost_units),
                        "lost_revenue": round(lost_revenue, 2)
                    })
                    estimated_revenue_loss += lost_revenue

            # Inject stochastic variance
            estimated_revenue_loss *= float(np.random.uniform(0.85, 1.15))

            # Allocation priority: variants closest to zero get priority
            allocation_priority = sorted(
                variants_at_risk,
                key=lambda x: x["weeks_until_stockout"]
            )[:10]  # top 10 most urgent

            pct_at_risk = len(variants_at_risk) / len(rows) if rows else 0

            return {
                "scenario": scenario,
                "parameters": req.parameters,
                "risk_level": _risk_level(pct_at_risk),
                "summary": f"{len(variants_at_risk)} variants will stock out before delayed restock arrives. Estimated ₹{estimated_revenue_loss:,.0f} revenue loss.",
                "details": {
                    "delay_days": delay_days,
                    "variants_at_risk": variants_at_risk,
                    "estimated_revenue_loss": round(estimated_revenue_loss, 2),
                    "allocation_priority": allocation_priority
                }
            }

        # ──────────────────────────────────────────────────────────────────────
        # SCENARIO 3: festival_surge
        # ──────────────────────────────────────────────────────────────────────
        elif scenario == "festival_surge":
            festival = req.parameters.get("festival", "diwali")
            weeks_until = int(req.parameters.get("weeks_until", 6))

            rows = _fetch_variant_stock(cur, req.manufacturer_id)

            by_variant = []
            total_units_to_prebuild = 0
            high_risk_count = 0

            for row in rows:
                variant_id, stock, size, colour, sku_id, sku_name, category, base_price, avg_weekly = row
                stock = float(stock or 0)
                avg_weekly = float(avg_weekly or 0)
                base_price = float(base_price or 0)

                multiplier = _category_multiplier(festival, category)
                surge_weekly_demand = avg_weekly * multiplier

                # Demand over the festival window (assume 4-week peak)
                festival_demand = surge_weekly_demand * 4.0

                # Stock needed by festival start (normal demand until then + festival peak)
                normal_consumption = avg_weekly * weeks_until
                total_stock_needed = normal_consumption + festival_demand
                prebuild_qty = max(0, round(total_stock_needed - stock))

                # Risk without action: will stock run out during festival?
                stock_at_festival = stock - normal_consumption
                weeks_cover_during_festival = (stock_at_festival / surge_weekly_demand) if surge_weekly_demand > 0 else 99

                if weeks_cover_during_festival < 1:
                    variant_risk = "high"
                    high_risk_count += 1
                elif weeks_cover_during_festival < 2:
                    variant_risk = "medium"
                else:
                    variant_risk = "low"

                total_units_to_prebuild += prebuild_qty
                by_variant.append({
                    "variant_id": str(variant_id),
                    "sku_name": sku_name,
                    "size": size,
                    "colour": colour,
                    "category": category,
                    "current_stock": round(stock),
                    "festival_demand_multiplier": multiplier,
                    "surge_weekly_demand": round(surge_weekly_demand, 1),
                    "prebuild_qty_recommended": prebuild_qty,
                    "weeks_of_cover_during_festival": round(weeks_cover_during_festival, 1),
                    "risk_without_action": variant_risk
                })

            # Inject stochastic variance
            total_units_to_prebuild = int(total_units_to_prebuild * float(np.random.uniform(0.9, 1.1)))
            pct_high_risk = high_risk_count / len(rows) if rows else 0
            overall_risk = _risk_level(pct_high_risk)

            return {
                "scenario": scenario,
                "parameters": req.parameters,
                "risk_level": overall_risk,
                "summary": f"{total_units_to_prebuild:,} units recommended to pre-build for {festival.title()}. {high_risk_count} variants at high stockout risk without action.",
                "details": {
                    "festival": festival,
                    "weeks_until": weeks_until,
                    "by_variant": by_variant,
                    "total_units_to_prebuild": total_units_to_prebuild,
                    "risk_without_action": overall_risk
                }
            }

        # ──────────────────────────────────────────────────────────────────────
        # SCENARIO 4: retailer_default
        # ──────────────────────────────────────────────────────────────────────
        elif scenario == "retailer_default":
            retailer_ids = req.parameters.get("retailer_ids", [])
            if not retailer_ids:
                raise HTTPException(status_code=400, detail="retailer_ids list cannot be empty")

            placeholders = ", ".join(["%s"] * len(retailer_ids))

            # Sum credit exposure
            cur.execute(f"""
                SELECT COALESCE(SUM(credit_used), 0) AS total_credit_exposure
                FROM retailers
                WHERE id IN ({placeholders})
            """, retailer_ids)
            credit_exposure = float(cur.fetchone()[0] or 0)

            # Estimate inventory at return risk (shipped to them - already sold)
            cur.execute(f"""
                SELECT
                    COALESCE(SUM(sl.quantity_shipped), 0) -
                    COALESCE((
                        SELECT SUM(ste.units_sold)
                        FROM sell_through_events ste
                        WHERE ste.retailer_id = sh.retailer_id
                    ), 0) AS units_at_risk
                FROM shipment_lines sl
                JOIN shipments sh ON sh.id = sl.shipment_id
                WHERE sh.manufacturer_id = %s
                  AND sh.retailer_id IN ({placeholders})
                GROUP BY sh.retailer_id
            """, [req.manufacturer_id] + retailer_ids)

            units_rows = cur.fetchall()
            inventory_return_risk_units = max(0, sum(int(r[0]) for r in units_rows if r[0] and r[0] > 0))

            # Working capital impact: credit exposure + cost to absorb returns
            # Assume average garment cost = 40% of base price
            cur.execute("""
                SELECT COALESCE(AVG(base_price), 500) FROM skus WHERE manufacturer_id = %s
            """, (req.manufacturer_id,))
            avg_price = float(cur.fetchone()[0] or 500)
            avg_cost = avg_price * 0.4

            # Inject stochastic variance
            working_capital_impact = float((credit_exposure + (inventory_return_risk_units * avg_cost)) * np.random.uniform(0.85, 1.15))

            pct_risk = min(credit_exposure / 1_000_000, 1.0)  # normalise to 10L max for risk gauge

            return {
                "scenario": scenario,
                "parameters": req.parameters,
                "risk_level": _risk_level(pct_risk),
                "summary": f"₹{credit_exposure:,.0f} credit exposure at risk. {inventory_return_risk_units:,} units may be returned. Total working capital impact: ₹{working_capital_impact:,.0f}.",
                "details": {
                    "retailer_ids_simulated": retailer_ids,
                    "credit_exposure": round(credit_exposure, 2),
                    "inventory_return_risk_units": inventory_return_risk_units,
                    "working_capital_impact": round(working_capital_impact, 2),
                    "avg_garment_cost_assumed": round(avg_cost, 2)
                }
            }

        # ──────────────────────────────────────────────────────────────────────
        # SCENARIO 5: margin_change
        # ──────────────────────────────────────────────────────────────────────
        elif scenario == "margin_change":
            markdown_pct = float(req.parameters.get("markdown_pct", 20))
            markdown_pct = max(0, min(70, markdown_pct))
            markdown_factor = markdown_pct / 100.0

            rows = _fetch_variant_stock(cur, req.manufacturer_id)

            variant_impacts = []
            total_projected_sell_improvement = 0
            total_margin_loss = 0.0
            total_revenue_gain = 0.0

            for row in rows:
                variant_id, stock, size, colour, sku_id, sku_name, category, base_price, avg_weekly = row
                stock = float(stock or 0)
                avg_weekly = float(avg_weekly or 0)
                base_price = float(base_price or 0)

                if avg_weekly == 0 or stock == 0:
                    continue

                # Markdown elasticity model: every 10% markdown → ~25% demand lift
                demand_lift = 1.0 + (markdown_pct / 10.0) * 0.25
                new_weekly_demand = avg_weekly * demand_lift
                new_price = base_price * (1 - markdown_factor)

                # Revenue comparison over 8 weeks
                old_revenue_8w = min(stock, avg_weekly * 8) * base_price
                new_revenue_8w = min(stock, new_weekly_demand * 8) * new_price
                margin_delta = new_revenue_8w - old_revenue_8w

                # Weeks to clear at new rate
                weeks_to_clear = stock / new_weekly_demand if new_weekly_demand > 0 else 999

                variant_impacts.append({
                    "variant_id": str(variant_id),
                    "sku_name": sku_name,
                    "size": size,
                    "colour": colour,
                    "current_stock": round(stock),
                    "original_price": round(base_price, 2),
                    "markdown_price": round(new_price, 2),
                    "demand_lift_pct": round((demand_lift - 1) * 100, 1),
                    "new_weekly_demand": round(new_weekly_demand, 1),
                    "weeks_to_clear": round(weeks_to_clear, 1),
                    "margin_impact_8w": round(margin_delta, 2),
                })

                total_margin_loss += max(0, -margin_delta)
                total_revenue_gain += max(0, margin_delta)
                total_projected_sell_improvement += round(new_weekly_demand - avg_weekly)

            # Inject stochastic variance
            total_revenue_gain *= float(np.random.uniform(0.85, 1.15))
            total_margin_loss *= float(np.random.uniform(0.85, 1.15))
            net_impact = total_revenue_gain - total_margin_loss
            pct_risk = 0.7 if net_impact < 0 else (0.3 if net_impact < total_revenue_gain * 0.3 else 0.1)

            return {
                "scenario": scenario,
                "parameters": req.parameters,
                "risk_level": _risk_level(pct_risk),
                "summary": f"{markdown_pct:.0f}% markdown projected to lift weekly demand by {total_projected_sell_improvement:,} units. Net 8-week margin impact: ₹{net_impact:,.0f}.",
                "details": {
                    "markdown_pct": markdown_pct,
                    "variant_impacts": variant_impacts,
                    "total_revenue_gain_8w": round(total_revenue_gain, 2),
                    "total_margin_loss_8w": round(total_margin_loss, 2),
                    "net_margin_impact": round(net_impact, 2),
                    "recommended_actions": [
                        f"Apply {markdown_pct:.0f}% markdown to slow-moving variants first.",
                        "Monitor sell-through weekly; adjust depth if clearance is too slow.",
                    ]
                }
            }

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown scenario '{req.scenario}'. Valid options: demand_spike, supply_delay, festival_surge, retailer_default, margin_change"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

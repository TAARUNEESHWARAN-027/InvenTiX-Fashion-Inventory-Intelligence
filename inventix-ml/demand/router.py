from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import pandas as pd
from prophet import Prophet
from db import get_db

router = APIRouter(prefix="/demand", tags=["Demand Forecasting"])


# ── Request schema ────────────────────────────────────────────────────────────
class ForecastRequest(BaseModel):
    variant_id: str
    retailer_id: str
    weeks_ahead: Optional[int] = 8


# ── POST /demand/forecast ─────────────────────────────────────────────────────
@router.post("/forecast")
def demand_forecast(req: ForecastRequest):
    conn = get_db()
    try:
        cur = conn.cursor()

        # Fetch last 90 days of sell-through events for this variant + retailer
        cur.execute("""
            SELECT DATE(sold_at) AS ds, SUM(units_sold) AS y
            FROM sell_through_events
            WHERE variant_id = %s
              AND retailer_id = %s
              AND sold_at >= NOW() - INTERVAL '90 days'
            GROUP BY DATE(sold_at)
            ORDER BY ds ASC
        """, (req.variant_id, req.retailer_id))

        rows = cur.fetchall()
        data_points = len(rows)

        # Insufficient data guard
        if data_points < 14:
            return {
                "forecast": None,
                "reason": "insufficient_data",
                "data_points_found": data_points,
                "weeks_ahead": req.weeks_ahead
            }

        # Build DataFrame for Prophet (requires ds and y columns)
        df = pd.DataFrame(rows, columns=["ds", "y"])
        df["ds"] = pd.to_datetime(df["ds"])
        df["y"] = df["y"].astype(float)

        # Fit Prophet model
        model = Prophet(
            weekly_seasonality=True,
            yearly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.80
        )

        # Add Indian festival seasonality
        model.add_country_holidays(country_name="IN")
        model.fit(df)

        # Create future weekly dataframe
        future = model.make_future_dataframe(periods=req.weeks_ahead, freq="W")
        forecast_df = model.predict(future)

        # Extract only the future predictions (beyond the training window)
        future_only = forecast_df[forecast_df["ds"] > df["ds"].max()].head(req.weeks_ahead)

        forecast_output = []
        for i, (_, row) in enumerate(future_only.iterrows(), start=1):
            forecast_output.append({
                "week": i,
                "week_starting": row["ds"].strftime("%Y-%m-%d"),
                "predicted_units": max(0, round(row["yhat"], 1)),
                "lower": max(0, round(row["yhat_lower"], 1)),
                "upper": max(0, round(row["yhat_upper"], 1))
            })

        # Confidence: high if 30+ data points, medium otherwise
        confidence = "high" if data_points >= 30 else "medium"

        return {
            "variant_id": req.variant_id,
            "retailer_id": req.retailer_id,
            "weeks_ahead": req.weeks_ahead,
            "data_points_used": data_points,
            "confidence": confidence,
            "forecast": forecast_output
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ── GET /demand/restock-signals ───────────────────────────────────────────────
@router.get("/restock-signals")
def restock_signals():
    conn = get_db()
    try:
        cur = conn.cursor()

        # Get all variant-retailer pairs with units held + avg weekly sell rate
        cur.execute("""
            WITH shipped AS (
                SELECT sl.variant_id, sh.retailer_id, SUM(sl.quantity_shipped) AS total_shipped
                FROM shipment_lines sl
                JOIN shipments sh ON sh.id = sl.shipment_id
                GROUP BY sl.variant_id, sh.retailer_id
            ),
            sold AS (
                SELECT variant_id, retailer_id,
                    SUM(units_sold) AS total_sold,
                    -- Average weekly sell rate over last 30 days
                    COALESCE(
                        SUM(CASE WHEN sold_at >= NOW() - INTERVAL '30 days' THEN units_sold ELSE 0 END) / 4.0,
                        0
                    ) AS avg_weekly_rate
                FROM sell_through_events
                GROUP BY variant_id, retailer_id
            )
            SELECT 
                sh.variant_id,
                sh.retailer_id,
                sh.total_shipped - COALESCE(so.total_sold, 0)    AS stock_at_retailer,
                COALESCE(so.avg_weekly_rate, 0)                   AS avg_weekly_rate
            FROM shipped sh
            LEFT JOIN sold so ON sh.variant_id = so.variant_id AND sh.retailer_id = so.retailer_id
            WHERE (sh.total_shipped - COALESCE(so.total_sold, 0)) > 0
        """)

        rows = cur.fetchall()

        signals = []
        for row in rows:
            variant_id, retailer_id, stock_at_retailer, avg_weekly_rate = row

            stock_at_retailer = float(stock_at_retailer or 0)
            avg_weekly_rate = float(avg_weekly_rate or 0)

            # Skip pairs with no sell velocity — no signal to generate
            if avg_weekly_rate <= 0:
                continue

            weeks_of_cover = stock_at_retailer / avg_weekly_rate

            # Only surface if within 3 weeks of cover
            if weeks_of_cover < 3:
                # Recommend enough stock to cover 6 more weeks
                recommended_restock_qty = max(0, round((avg_weekly_rate * 6) - stock_at_retailer))

                if weeks_of_cover < 1:
                    urgency = "urgent"
                elif weeks_of_cover < 2:
                    urgency = "soon"
                else:
                    urgency = "monitor"

                signals.append({
                    "variant_id": str(variant_id),
                    "retailer_id": str(retailer_id),
                    "stock_at_retailer": round(stock_at_retailer),
                    "avg_weekly_sell_rate": round(avg_weekly_rate, 2),
                    "weeks_of_cover": round(weeks_of_cover, 2),
                    "recommended_restock_qty": recommended_restock_qty,
                    "urgency": urgency
                })

        # Sort: urgent first, then soon, then monitor
        urgency_order = {"urgent": 0, "soon": 1, "monitor": 2}
        signals.sort(key=lambda x: (urgency_order[x["urgency"]], x["weeks_of_cover"]))

        return {"restock_signals": signals, "total": len(signals)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

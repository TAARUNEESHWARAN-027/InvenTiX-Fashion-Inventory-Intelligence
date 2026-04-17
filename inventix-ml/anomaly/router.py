from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from db import get_db

router = APIRouter(prefix="/anomaly", tags=["Anomaly Detection"])


# ── Request schema ────────────────────────────────────────────────────────────
class ScanRequest(BaseModel):
    manufacturer_id: str


# ── POST /anomaly/scan ────────────────────────────────────────────────────────
@router.post("/scan")
def anomaly_scan(req: ScanRequest):
    conn = get_db()
    try:
        cur = conn.cursor()

        # Fetch last 30 days of stock_updates for this manufacturer
        cur.execute("""
            SELECT
                su.id            AS stock_update_id,
                su.variant_id,
                su.quantity_delta,
                su.created_at,
                v.sku_id
            FROM stock_updates su
            JOIN sku_variants v ON su.variant_id = v.id
            JOIN skus s ON v.sku_id = s.id
            WHERE s.manufacturer_id = %s
              AND su.created_at >= NOW() - INTERVAL '30 days'
            ORDER BY su.created_at ASC
        """, (req.manufacturer_id,))

        rows = cur.fetchall()

        if len(rows) < 3:
            return {"anomalies": [], "reason": "insufficient_data", "records_scanned": len(rows)}

        df = pd.DataFrame(rows, columns=["stock_update_id", "variant_id", "quantity_delta", "created_at", "sku_id"])
        df["created_at"] = pd.to_datetime(df["created_at"])
        df["quantity_delta"] = df["quantity_delta"].astype(float)

        # ── Feature Engineering ───────────────────────────────────────────────

        # Feature 1: quantity_delta (raw — large spikes are anomalous)
        df["feat_quantity_delta"] = df["quantity_delta"]

        # Feature 2: frequency_per_sku — how many times each sku was updated
        sku_freq = df.groupby("sku_id")["stock_update_id"].transform("count")
        df["feat_frequency_per_sku"] = sku_freq

        # Feature 3: time_between_updates per variant (seconds)
        df = df.sort_values(["variant_id", "created_at"])
        df["feat_time_between_updates"] = (
            df.groupby("variant_id")["created_at"]
            .diff()
            .dt.total_seconds()
            .fillna(df.groupby("variant_id")["created_at"].diff().dt.total_seconds().median())
            .fillna(86400)  # default 24h if still NaN
        )

        features = df[["feat_quantity_delta", "feat_frequency_per_sku", "feat_time_between_updates"]].values

        # ── Isolation Forest ──────────────────────────────────────────────────
        model = IsolationForest(
            n_estimators=100,
            contamination=0.1,  # expect ~10% anomalous records
            random_state=42
        )
        df["anomaly_score"] = model.fit_predict(features)
        df["raw_score"] = model.score_samples(features)  # continuous score for thresholding

        # Flag records with raw_score < -0.3 as suspicious
        suspicious = df[df["raw_score"] < -0.3].copy()

        # ── Classify anomaly type ─────────────────────────────────────────────
        median_delta = df["quantity_delta"].median()

        # Pre-compute repeated damage: same sku updated 3+ times with negative delta
        neg_updates = df[df["quantity_delta"] < 0].groupby("sku_id").size()
        repeated_damage_skus = set(neg_updates[neg_updates >= 3].index.tolist())

        anomalies = []
        for _, row in suspicious.iterrows():
            # Determine anomaly type
            if median_delta > 0 and row["quantity_delta"] > 5 * median_delta:
                anomaly_type = "sudden_stock_spike"
            elif row["sku_id"] in repeated_damage_skus and row["quantity_delta"] < 0:
                anomaly_type = "repeated_damage"
            else:
                anomaly_type = "unusual_activity"

            anomalies.append({
                "stock_update_id": str(row["stock_update_id"]),
                "variant_id": str(row["variant_id"]),
                "anomaly_type": anomaly_type,
                "score": round(float(row["raw_score"]), 4),
                "detected_at": row["created_at"].isoformat()
            })

        return {
            "manufacturer_id": req.manufacturer_id,
            "records_scanned": len(df),
            "anomalies_found": len(anomalies),
            "anomalies": anomalies
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ── GET /anomaly/risk-scores ──────────────────────────────────────────────────
@router.get("/risk-scores")
def risk_scores():
    conn = get_db()
    try:
        cur = conn.cursor()

        # Fetch all manufacturers
        cur.execute("SELECT id, name, city FROM manufacturers")
        manufacturers = cur.fetchall()

        # Platform average return rate (negative stock_updates / total stock_updates)
        cur.execute("""
            SELECT
                CASE WHEN COUNT(*) > 0 THEN
                    SUM(CASE WHEN su.quantity_delta < 0 THEN 1 ELSE 0 END)::FLOAT / COUNT(*)
                ELSE 0 END AS platform_return_rate
            FROM stock_updates su
            WHERE su.created_at >= NOW() - INTERVAL '30 days'
        """)
        platform_row = cur.fetchone()
        platform_return_rate = float(platform_row[0]) if platform_row else 0.0

        results = []

        for mfr_id, mfr_name, mfr_city in manufacturers:
            # Component 1 (40%): anomaly_flag_count in last 30 days
            cur.execute("""
                SELECT COUNT(*) FROM anomaly_flags af
                LEFT JOIN sku_variants sv ON af.entity_type='sku_variant' AND af.entity_id=sv.id
                LEFT JOIN skus s ON sv.sku_id=s.id
                WHERE af.created_at >= NOW() - INTERVAL '30 days'
                  AND (
                    (af.entity_type='manufacturer' AND af.entity_id=%s) OR
                    (af.entity_type='sku_variant' AND s.manufacturer_id=%s)
                  )
            """, (mfr_id, mfr_id))
            anomaly_count = int(cur.fetchone()[0])

            # Component 2 (30%): return rate vs platform average
            cur.execute("""
                SELECT
                    CASE WHEN COUNT(*) > 0 THEN
                        SUM(CASE WHEN su.quantity_delta < 0 THEN 1 ELSE 0 END)::FLOAT / COUNT(*)
                    ELSE 0 END AS return_rate
                FROM stock_updates su
                JOIN sku_variants v ON su.variant_id = v.id
                JOIN skus s ON v.sku_id = s.id
                WHERE s.manufacturer_id = %s
                  AND su.created_at >= NOW() - INTERVAL '30 days'
            """, (mfr_id,))
            mfr_return_rate = float(cur.fetchone()[0] or 0)

            # Component 3 (30%): credit default events in last 30 days
            cur.execute("""
                SELECT COUNT(*) FROM credit_events
                WHERE manufacturer_id = %s
                  AND event_type = 'default'
                  AND created_at >= NOW() - INTERVAL '30 days'
            """, (mfr_id,))
            default_count = int(cur.fetchone()[0])

            # ── Normalise components to 0–100 scale ──────────────────────────

            # Anomaly count: normalise assuming max meaningful count = 20
            anomaly_score = min(anomaly_count / 20.0, 1.0) * 100

            # Return rate: excess over platform average, normalised (max 100%)
            return_ratio = 0.0
            if platform_return_rate > 0:
                return_ratio = min((mfr_return_rate / platform_return_rate) - 1.0, 1.0)
                return_ratio = max(return_ratio, 0.0)
            return_score = return_ratio * 100

            # Default count: normalise assuming max meaningful count = 5
            default_score = min(default_count / 5.0, 1.0) * 100

            # Composite weighted score
            composite = (
                (anomaly_score * 0.40) +
                (return_score  * 0.30) +
                (default_score * 0.30)
            )

            results.append({
                "manufacturer_id": str(mfr_id),
                "manufacturer_name": mfr_name,
                "city": mfr_city,
                "risk_score": round(composite, 1),
                "components": {
                    "anomaly_flag_count": anomaly_count,
                    "anomaly_score_component": round(anomaly_score, 1),
                    "return_rate": round(mfr_return_rate, 4),
                    "return_score_component": round(return_score, 1),
                    "credit_default_count": default_count,
                    "default_score_component": round(default_score, 1)
                }
            })

        # Sort by risk_score descending
        results.sort(key=lambda x: x["risk_score"], reverse=True)
        return {"risk_scores": results, "total": len(results)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

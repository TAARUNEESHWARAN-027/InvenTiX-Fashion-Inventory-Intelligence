from fastapi import FastAPI
import uvicorn

from demand.router import router as demand_router
from anomaly.router import router as anomaly_router
from simulation.router import router as simulation_router

app = FastAPI(
    title="InvenTiX ML Microservice",
    description="Demand forecasting, anomaly detection, and simulation engine for InvenTiX.",
    version="1.0.0"
)

# Include sub-routers
app.include_router(demand_router)
app.include_router(anomaly_router)
app.include_router(simulation_router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "inventix-ml"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

InvenTiX 🚀 B2B Fashion Inventory Intelligence Platform

The Reality Check (The Problem) The Indian B2B fashion supply chain operates entirely on relationship-based credit (udhari). Once goods leave the manufacturer's warehouse, all visibility is lost.
30% of all Indian fashion inventory goes unsold annually.

40% margin erosion stems from unplanned markdowns and size/color imbalances.

Zero existing tools solve post-shipment visibility. Existing platforms handle ordering; they do not track retail sell-through.

The Weapon (The Solution) InvenTiX is not a dashboard; it is a decision engine. It eliminates the post-shipment blind spot by providing real-time visibility into inventory once it enters the retail network. It is powered by five core intelligence engines:
Real-Time Downstream Visibility Layer: Live sell-through tracking across every retailer in the network.

Predictive Demand Engine: SKU-level forecasting utilizing the Indian festival calendar and regional patterns.

Size & Colour Velocity Intelligence: Identifies stagnant sizes and optimizes future production set ratios.

Anomaly Detection Engine: Unsupervised ML that auto-flags fraud, ghost restocks, and suspicious return spikes.

Simulation Mode: What-if scenario modeling (demand spikes, supply delays, retailer defaults) to manage risk proactively.

Technology Stack Built for high information density, real-time synchronization, and AI inference.
Frontend: React.js, TypeScript, Tailwind CSS, shadcn/ui, Recharts, D3.js, Framer Motion.

Backend: Node.js, Express.js, PostgreSQL, Socket.io (Real-time events).

Machine Learning: Python, FastAPI, Facebook Prophet (Demand), scikit-learn/Isolation Forest (Anomalies).

Infrastructure: Vercel (Frontend), Railway (Backend & ML).

System Architecture Plaintext ┌──────────────────────────────────────────────────────────────┐ │ FRONTEND (React) │ │ Seller Dashboard (Command Table, Live Map, Simulation) │ │ Admin Dashboard (Anomaly Feed, Risk Analytics, Audit) │ └───────────────────────┬──────────────────────────────────────┘ │ REST + Socket.IO ┌───────────────────────▼──────────────────────────────────────┐ │ BACKEND (Node.js) │ │ Inventory Core ──► Auth ──► Alert Engine ──► Retailer APIs │ │ PostgreSQL (SKUs, Variants, Sell-Through, Events, Users) │ └───────────────────────┬──────────────────────────────────────┘ │ REST (Internal) ┌───────────────────────▼──────────────────────────────────────┐ │ ML MICROSERVICE (Python) │ │ Demand Forecaster ──► Anomaly Detector ──► Sim Engine │ └──────────────────────────────────────────────────────────────┘
Local Setup & Execution Follow these steps to deploy the environment locally. Precision is mandatory.
Prerequisites Node.js v18+

Python 3.10+

PostgreSQL database

Step 1: Clone and Install Bash git clone https://github.com/TAARUNEESHWARAN-027/InvenTiX-Fashion-Inventory-Intelligence.git cd InvenTiX-Fashion-Inventory-Intelligence Step 2: Backend Setup Bash cd inventix-backend npm install cp .env.example .env # Configure DATABASE_URL npm run seed # Seed the database with baseline test data npm run dev # Starts on port 5000 Step 3: ML Microservice Setup Bash cd ../inventix-ml pip install -r requirements.txt cp .env.example .env # Configure DATABASE_URL uvicorn main:app --reload --port 8000 Step 4: Frontend Setup Bash cd ../inventix-frontend npm install npm run dev # Starts on port 5173 6. Project Structure /inventix-backend: Node.js Express server, Socket.io registry, and PostgreSQL models.

/inventix-frontend: React UI, D3 visualizations, and real-time state hooks.

/inventix-ml: FastAPI microservice housing Prophet and scikit-learn models.

License: MIT © 2026 S. TAARUNEESHWARAN

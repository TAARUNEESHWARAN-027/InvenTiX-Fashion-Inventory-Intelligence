# INVENTIX — B2B Fashion Inventory Intelligence Platform
### Product Requirements Document · v2.0
*Hackathon Submission · Problem Statement 1 · Domain: Fashion & Merchandising Digital Operations*

---

| **30%** Indian fashion inventory unsold each season | **40%** Margin erosion from unplanned markdowns | **₹115B+** India apparel market — 2024 | **0** Tools solving post-shipment visibility today |
|---|---|---|---|

---

## 1. Abstract

InvenTiX is a B2B Fashion Inventory Intelligence Platform purpose-built for Indian fashion manufacturers and wholesalers who supply to networks of retail buyers. It eliminates the most expensive and most ignored problem in Indian B2B fashion: after goods ship from manufacturer to retailer, the manufacturer goes completely blind.

No sell-through data flows back. No early warning exists for dead stock. No system flags credit risk building in a retailer's unsold pile. Everything runs on WhatsApp catalogs and gut feeling — until returns arrive and margin is already gone.

InvenTiX closes this gap with five integrated intelligence engines:

- **Real-Time Downstream Visibility Layer** — live sell-through tracking across every retailer in the network
- **Predictive Demand Engine** — per-SKU forecasts using Indian festival calendar and regional patterns
- **Size & Colour Velocity Intelligence** — identifies exactly which sizes die and adjusts production ratios
- **Anomaly Detection Engine** — auto-flags fraud, ghost restocks, suspicious return spikes for admin review
- **Simulation Mode** — what-if scenario modelling before any commitment is made

InvenTiX is not a dashboard. It is a decision engine. It moves Indian B2B fashion from operating on instinct to operating on intelligence — saving manufacturers crores in dead stock, margin erosion, and credit defaults every season.

---

## 2. Problem Statement

### 2.1 The Indian B2B Fashion Supply Chain

India's B2B fashion supply chain follows a three-tier structure: manufacturers produce in bulk (Surat, Tirupur, Delhi, Jaipur), wholesalers aggregate and redistribute, and retailers purchase on credit to sell to end consumers. The chain powers a market valued at over USD 115 billion in 2024.

This supply chain runs almost entirely on relationship-based credit (udhari). A manufacturer ships 5,000 pieces to 100 boutiques across Maharashtra and Gujarat. Payment arrives 30–60 days later. The manufacturer has zero visibility into whether those pieces are selling, sitting, or heading back as returns.

### 2.2 The Three Players

| **Role** | **Description** |
|---|---|
| Manufacturer / Supplier | Makes clothes in bulk — Surat kurti maker, Tirupur knitwear factory |
| Wholesaler / Distributor | Buys from manufacturer, sells to retailers — stocks 50 brands, supplies 200 boutiques |
| Retailer / Buyer | Buys wholesale, sells to end customer — boutiques, multi-brand stores, regional shops |

**InvenTiX's primary target is the Manufacturer or Wholesaler** — because they manage inventory at scale, supply multiple retail buyers simultaneously, and suffer the highest loss when post-shipment intelligence is missing.

### 2.3 The Four Bleeding Wounds

#### Wound 1 — The Credit + Dead Stock Trap

In Indian B2B fashion, nearly everything moves on credit. Goods ship. Retailers pay later. But if a style does not sell, stock returns to the manufacturer — weeks later, out of season, and unmarketable. The manufacturer absorbs the full loss: production, shipping, storage, and the opportunity cost of locked capital. Nobody tracked the sell-through. Nobody issued a warning.

#### Wound 2 — Blind Bulk Production

Manufacturers plan next season's production based on last season's orders and instinct. They have zero access to real retail sell-through data. Industry data shows 30% of all Indian fashion inventory goes unsold annually — a direct result of this information blackout.

#### Wound 3 — Size & Colour Imbalance Killing Margin

Manufacturers ship in sets: one piece per size per colour. Retailers sell through popular sizes instantly while extreme sizes stagnate. The retailer stops reordering the entire style. The manufacturer loses the reorder and never understands why. Industry data shows this size imbalance causes up to 20% profit loss on affected styles.

#### Wound 4 — Zero Downstream Visibility After Shipment

The moment goods leave a manufacturer's warehouse, all visibility ends. No sell-through rates. No retailer-level risk signals. No trending styles. No restocking intelligence. Every decision post-shipment is made in the dark. Dead stock rarely looks dead in reports — by the time it's noticed, the damage is done.

### 2.4 Why Existing Tools Fail

| **Tool** | **What It Does** | **Critical Gap** | **Post-Shipment Intel** |
|---|---|---|---|
| JOOR / Faire / NuORDER | Digital ordering, catalog management, payment portals | Zero post-shipment sell-through visibility | None |
| Unicommerce | Warehouse management, multi-channel fulfillment | No downstream retail intelligence for manufacturers | None |
| Zoho Inventory / Tally | Internal stock tracking and accounting | Single-entity only — no supply chain visibility | None |
| WhatsApp + Excel | Order taking, catalog sharing via image groups | No tracking, no analytics, no alerts, no intelligence | Entire Market |

**The gap all these tools share: none solve the post-shipment intelligence problem.** None give a manufacturer in Surat real-time visibility into sell-through at a boutique in Pune. InvenTiX is built to close this gap permanently.

---

## 3. Target Customer

### 3.1 Primary User — Manufacturer / Wholesaler (Seller Dashboard)

The primary InvenTiX user is a mid-scale Indian fashion manufacturer or wholesaler who:

- Produces or aggregates between 500 and 50,000 units per season
- Supplies to between 50 and 500 retail buyers: boutiques, multi-brand stores, regional distributors
- Operates on credit terms of 30 to 90 days with outstanding balances across 100s of retailers
- Manages between 100 and 5,000 active SKUs across sizes and colours
- Currently tracks inventory via Tally, spreadsheets, or WhatsApp-based manual systems
- Is based in or sources from Surat, Tirupur, Delhi, Jaipur, Mumbai, Ludhiana, or Ahmedabad

### 3.2 Secondary User — Platform Admin

The admin is the platform operator running InvenTiX as a SaaS. They oversee all manufacturers and retailers on the platform: ensuring data integrity, detecting fraud, enforcing policy, and surfacing macro-level trends that benefit the entire ecosystem.

### 3.3 Tertiary User — Retail Buyer

Retailers who buy from manufacturers can optionally connect their POS data to provide real sell-through signals. This is the critical data input that powers the manufacturer's downstream visibility. Retailers benefit from smarter restocking recommendations and reduced overstock at their end.

---

## 4. Solution Overview

### 4.1 Product Vision

InvenTiX is a sell-through intelligence and decision engine for Indian B2B fashion. It gives manufacturers real-time visibility into what is happening to their inventory after it ships — and then tells them what to do about it before the damage compounds.

| **Engine** | **What It Does** | **Business Impact** |
|---|---|---|
| Real-Time Downstream Layer | Live sell-through tracking across manufacturer warehouse and all retail buyers in the network | Eliminates the post-shipment blind spot permanently |
| Predictive Demand Engine | Forecasts sell-through per SKU/size/colour; flags restocking needs before stockouts occur | Ends blind bulk production — saves 20–30% overproduction cost |
| Size & Colour Velocity Intel | Identifies exact size-colour sell patterns; recommends production ratio adjustments per style | Recovers up to 20% margin lost from size imbalance |
| Anomaly Detection Engine | Auto-detects fraud, ghost restocks, return spikes, credit exposure spikes in real time | Protects platform integrity; flags risk before loss occurs |
| Simulation Mode | What-if scenario modelling: demand spikes, supply delays, festival surges, retailer defaults | Proactive risk management before any real commitment |

---

## 5. Feature Specifications

### 5.1 Real-Time Inventory Tracking Layer

#### 5.1.1 Seller Dashboard (Manufacturer / Wholesaler View)

**Inventory Command Table**

- Complete inventory view: all products, variants, colours, sizes, SKUs with visual stock status (Green = healthy, Yellow = low, Red = critical)
- Add or update stock with mandatory reason codes: Restock, Production Complete, Damaged, QC Failed, Return Received, Transfer Out
- Tag inventory by season: SS25, FW25, Festival Drop, Clearance — with cross-season comparison
- Bulk stock upload via CSV with field mapping wizard (SKU, colour, size, quantity, reason, season)
- Per-SKU movement timeline: who updated, what changed, when, from which device or IP address
- Inventory freshness score per SKU: auto-calculated based on days since last movement and current sell-through velocity

**Live Retailer Stock Map**

- Real-time view of all inventory currently held by each retail buyer across the network
- Per-retailer metrics: total units held, sell-through rate, days since last sale, estimated weeks of stock remaining
- Colour-coded retailer health tiles: Green (selling well), Yellow (slowing), Red (stalled — potential return risk)
- Click any retailer tile to drill into their SKU-level sell-through data, sales history, and credit balance
- Geographic retailer map view: pin-drop of retailer locations with heat overlay showing sell-through intensity by region

**Alerts & Notifications Centre**

- Dead stock early warning: any SKU at a retailer with zero movement for configurable X days, flagged before it becomes a return
- Fast-moving SKU alert: items selling faster than forecast, triggering proactive restocking recommendation
- Credit risk alert: retailer's sell-through dropping below repayment-safe threshold while credit balance remains outstanding
- Size imbalance alert: when a specific size accounts for more than 40% of unsold inventory across 3+ retailers for the same style
- Upcoming credit due date reminders with linked inventory health status of that retailer

#### 5.1.2 Admin Oversight Panel

- Full real-time inventory activity feed across all manufacturers on the platform
- Approve or flag suspicious stock updates — especially sudden large quantity increases without matching purchase orders
- Auto-detection of dead stock accumulation across the platform, organised by category and region
- Cross-manufacturer analytics: fastest-moving categories, trending sizes, colour demand by region and season
- Full audit log with timestamps, user IDs, action types, and IP addresses for every event on the platform
- Stock freeze enforcement on flagged SKUs: suspicious inventory cannot be moved or sold during investigation

### 5.2 Predictive Demand Engine

This is not analytics. Analytics shows what happened. The Predictive Engine tells you what will happen and what to do about it — before the damage occurs.

#### 5.2.1 Demand Forecasting Per SKU

- Ingests historical sell-through data per SKU, size, colour, retailer, and region
- Applies weighted moving average as baseline with Facebook Prophet for Indian seasonality and festival calendar integration
- Factors: Diwali, Eid, Navratri, wedding season, Republic Day sale, regional demand patterns, category trend signals
- Outputs: projected units sold per week for next 4 and 8 weeks per SKU per retailer, with confidence intervals
- Sell-Through Forecast Card per SKU: current stock at retailer + projected weeks of cover remaining
- Restock Recommendation: suggested restock quantity and timing per retailer, generated before they run out
- Production Planning Signal: aggregate demand forecast across all retailers to guide next production batch sizing
- Seasonal Risk Score: likelihood a current style will go dead before season ends, based on early sell-through velocity

#### 5.2.2 Size & Colour Velocity Intelligence

- Per-style breakdown of sell-through velocity by size and colour, visualised as an interactive heatmap
- Flag size imbalance: styles where M and L are sold out but XL and XXL are stalling across multiple retailers simultaneously
- Recommended set ratio adjustment for next production: instead of 1-1-1-1-1, suggest 2-3-3-2-1 based on actual velocity data
- Colour demand heatmap: which colours move fastest by region and season, updated in real time
- Style retirement signal: when a style's velocity across all sizes drops below threshold — flag for clearance pricing before season end

#### 5.2.3 Credit Risk Forecasting

- Combines sell-through rate with outstanding credit balance per retailer to generate a forward-looking risk score
- Credit Risk Score: 0–100, mapped to Low / Medium / High / Critical with projected repayment probability
- Alert manufacturer when a retailer's sell-through drops below repayment-safe threshold
- Trend view: is a retailer's sell-through improving or deteriorating week over week — directional risk signal
- Credit exposure ranking: which retailers represent the highest combined credit + dead-stock risk at any moment

### 5.3 Anomaly Detection Engine (Admin Intelligence Layer)

Admins cannot manually review thousands of inventory events per day. This engine automates anomaly detection and surfaces only what needs human attention — with a risk score already computed and attached.

| **Anomaly Type** | **Detection Logic** | **Risk Signal** | **Severity** |
|---|---|---|---|
| Sudden Stock Spike | Stock increases 5x+ in single update without matching PO | Inventory inflation / fraud | Critical |
| Repeated Damage Entries | Same SKU marked damaged 3+ times in 30 days by same seller | Write-off fraud / QC abuse | High |
| Unusual Return Spike | Return rate 2+ standard deviations above platform average for category | Buyer-side fraud / quality issue | High |
| Ghost Restock | Stock marked restocked with no inbound shipment record present | Fictitious inventory inflation | Critical |
| Zero Sell-Through Cliff | SKU with strong history drops to zero for 14+ days with no seasonal reason | Retailer disengagement / product issue | Medium |
| Credit Exposure Spike | Outstanding credit to single retailer up 40%+ in one cycle while sell-through drops | Silent default risk building | Critical |

#### 5.3.1 Risk Score Per Seller

- Every seller (manufacturer and retailer) receives a dynamic Risk Score from 0 to 100, updated in real time
- Score components: inventory accuracy history, return rate, damage claim rate, credit repayment track record, sell-through consistency
- Admin dashboard shows sellers ranked by risk score with one-click drill-down into flagged events and full audit trail

#### 5.3.2 Admin Action Panel

- Approve or reject flagged anomaly with mandatory reason code attached to the audit log
- Escalate to dispute resolution workflow with timestamped evidence chain
- Freeze a specific SKU or seller account pending investigation — no movement allowed during review
- Send automated compliance notice to seller with evidence request attached
- Override risk score with manual annotation where business context warrants it

### 5.4 Simulation Mode

**Simulation Mode is InvenTiX's most differentiated feature.** It moves the platform from reactive (what happened) and predictive (what will happen) to strategic (what should I do given this scenario). Manufacturers can run a scenario in seconds, see projected business impact, and act before any real commitment is made.

| **Scenario** | **Input Parameters** | **Output Generated** |
|---|---|---|
| Demand Spike | Demand increases by X% (slider: 10%–300%) | Stockout risk per SKU, revenue at risk, recommended emergency restock quantity and timing |
| Supply Delay | Inbound shipment delayed by N days (slider: 1–30) | Which SKUs hit zero before restock arrives, estimated revenue loss, which retailers to prioritise |
| Festival Surge | Select Indian festival: Diwali, Eid, Navratri, wedding season, Republic Day sale | Category/SKU-level demand surge forecast, recommended pre-build quantities by size and colour |
| Retailer Default | Simulate one or more retailers defaulting on credit | Total credit exposure loss, unsold inventory at return risk, working capital and cashflow impact |
| Price or Margin Change | Apply a markdown of X% to a category or SKU set | Projected sell-through improvement, break-even point, net margin impact, minimum markdown depth to clear within season |

#### 5.4.1 Simulator Output Interface

- Visual risk gauge: Red, Yellow, or Green outcome at a glance before reading detail
- SKU-level impact table: which specific products are most at risk in this scenario and by how much
- Recommended actions panel: what to do right now to mitigate simulated risk, prioritised by urgency
- Save and compare: run multiple scenarios side by side (e.g. 20% demand spike vs 50% demand spike)
- Export simulation report as PDF for sharing with production team, suppliers, or investors
- One-click Execute Recommended Action: directly trigger a restock order or retailer alert from simulation output

---

## 6. Key User Stories

| **User** | **I want to...** | **So that...** |
|---|---|---|
| Manufacturer | See live sell-through rates for all my SKUs at every retailer in my network | I know what is selling before reorders stop coming |
| Manufacturer | Receive an early warning when a retailer's stock is stalling for more than two weeks | I can intervene before it becomes a margin-destroying return |
| Manufacturer | Get a demand forecast for next month per SKU per retailer | I can plan production accurately instead of guessing |
| Manufacturer | Know which sizes and colours are selling fastest at each retailer | I can adjust my next production set ratios to match real demand |
| Manufacturer | Simulate what happens if Diwali demand is 40% higher than last year | I can pre-build the right quantities six weeks early without overproducing |
| Manufacturer | See a credit risk score for each of my retail buyers updated in real time | I can manage credit exposure proactively before a default surprises me |
| Admin | See a risk score for every seller ranked by severity | I can prioritise oversight attention on the highest-risk accounts first |
| Admin | Receive an auto-flag when stock jumps from 5 to 500 units without a matching PO | I can investigate before fraudulent inventory is used for deceptive transactions |
| Admin | View a full audit log of every inventory action with user ID and IP address | I have complete traceability for compliance and dispute resolution |
| Admin | Enforce a stock freeze on a flagged SKU pending investigation | Suspicious stock cannot be moved while under review |
| Retailer | Receive smart restocking recommendations from my supplier | I avoid running out of fast-moving sizes and missing sales |
| Retailer | See which of my stock is ageing and needs clearance pricing | I reduce my own overstock before it becomes a return the supplier blames me for |

---

## 7. Technology Stack

### 7.1 Architecture Overview

InvenTiX uses a modern, scalable architecture designed for real-time data processing, AI inference, and interactive simulation. All components are chosen for hackathon buildability while remaining production-grade in design pattern and infrastructure.

| **Layer** | **Technology** | **Rationale** | **Type** |
|---|---|---|---|
| Frontend Framework | React.js + TypeScript | Component-based UI ideal for dashboard complexity. TypeScript prevents runtime errors in complex multi-role state. | Core |
| Styling & Components | Tailwind CSS + shadcn/ui | Rapid, consistent, professional styling. shadcn/ui provides production-grade tables, charts, forms, alerts out of the box. | Core |
| Data Visualisation | Recharts + D3.js | Recharts for standard charts; D3 powers the custom size-colour velocity heatmap and retailer geographic heat map. | Core |
| Simulation UI | React custom state engine | Slider-driven inputs update simulation state in real time. Output renders as live React component — impressive demo experience. | Core |
| Backend API | Node.js + Express.js | Fast REST API development. Handles concurrent real-time inventory event requests efficiently with middleware-based architecture. | Core |
| Primary Database | PostgreSQL | Relational structure suits complex relationships between manufacturers, SKUs, retailers, and transactions. Strong time-series query support. | Core |
| Real-Time Layer | Socket.io (WebSockets) | Real-time push of inventory events, anomaly alerts, and sell-through updates to connected dashboards without polling. | Core |
| ML: Demand Forecasting | Python FastAPI + Facebook Prophet | Prophet handles Indian seasonality and festival calendar natively. FastAPI exposes model as REST microservice. | AI |
| ML: Anomaly Detection | Isolation Forest (scikit-learn) | Unsupervised anomaly detection. Works without labelled fraud training data. Fast inference enables real-time flagging. | AI |
| Simulation Engine | Python + NumPy + Pandas | Vectorised scenario calculations are fast and numerically accurate. Pandas handles inventory state dataframes. | AI |
| Authentication | JWT + bcrypt | Stateless authentication for multi-role system: manufacturer, retailer, admin. Role-based access control at API middleware level. | Security |
| Hosting | Vercel (Frontend) + Railway (Backend) | Free tier hosting sufficient for hackathon demo. Production-equivalent infrastructure, zero DevOps overhead. | Infra |

---

## 8. UI / UX Design Vision

### 8.1 Design Philosophy

InvenTiX's UI is built on one principle: **ruthless clarity under high information density.** A manufacturer managing 2,000 SKUs across 150 retailers cannot afford cognitive overhead. Every design decision — color, motion, hierarchy — is engineered to surface the right signal at the right moment.

Design reference: the dark, high-information density aesthetics of Bloomberg Terminal, Figma, Linear, and Vercel — paired with the kinetic energy of fintech dashboards from Stripe and Brex.

### 8.2 Visual Design System

| **Token** | **Value** |
|---|---|
| Primary Background | `#0D1B2A` — Deep Navy (not pure black — prevents eye strain) |
| Card / Surface | `#1A2744` — Mid Dark Blue |
| Primary Accent | `#00C2FF` — Electric Cyan (data highlights, CTAs, live indicators) |
| Secondary Accent | `#7B2FBE` — Deep Violet (AI / prediction features) |
| Success / Healthy | `#00E5A0` — Neon Mint |
| Warning / Low Stock | `#FFB800` — Amber |
| Critical / Dead Stock | `#FF4757` — Alert Red |
| Typography | Inter (UI) + JetBrains Mono (data values, SKU codes) |
| Motion | Framer Motion — micro-animations on data updates, pulse on live indicators |
| Charts | Dark-themed Recharts with electric cyan lines, amber thresholds, red alert bands |

### 8.3 Dashboard Layout Architecture

Left sidebar (240px): navigation, role switcher (Manufacturer / Admin), global search. Top bar: product name, live connection status, notifications bell with unread count, user profile. Main content: 12-column grid, responsive. Cards: 8px border-radius, subtle blue-glow on hover. All live data indicators: animated green pulse dot.

### 8.4 Key Screen Designs

- **Inventory Command Table:** Dark table with sticky header, virtual scroll for 2000+ SKUs, inline status badges (green/yellow/red pills), expandable row for full SKU history timeline
- **Retailer Stock Map:** Split view — left panel = sortable retailer list with health tiles, right panel = live geographic heat map of India showing sell-through intensity by pin location
- **Demand Forecast Card:** SKU-level card with mini sparkline chart, weeks-of-cover gauge, and one-click restock trigger button
- **Size-Colour Velocity Heatmap:** D3 grid — styles on Y-axis, sizes on X-axis, colour = sell-through velocity (cool to hot scale), click to drill into retailer-level detail
- **Simulation Mode:** Full-screen overlay with left panel for scenario sliders and right panel for live updating output — risk gauge animates as sliders move
- **Admin Anomaly Feed:** Real-time scrolling feed of flagged events, each with risk severity badge, one-click approve/escalate/freeze actions inline

---

## 9. Core Data Model

### 9.1 Entity Relationship Summary

| **Entity** | **Fields** |
|---|---|
| Manufacturer | id, name, location, category focus, tier, created_at |
| Retailer | id, name, city, state, credit_limit, credit_used, risk_score, created_at |
| SKU | id, manufacturer_id, name, category, season, base_price, active |
| SKU Variant | id, sku_id, colour, size, current_stock, last_updated |
| Shipment | id, manufacturer_id, retailer_id, shipped_at, total_units, credit_terms_days |
| Shipment Line | id, shipment_id, variant_id, quantity_shipped |
| Sell-Through Event | id, variant_id, retailer_id, units_sold, sold_at, source (POS/manual) |
| Stock Update | id, variant_id, updated_by, quantity_delta, reason_code, ip_address, timestamp |
| Anomaly Flag | id, entity_type, entity_id, anomaly_type, severity, status, created_at |
| Credit Event | id, retailer_id, manufacturer_id, event_type, amount, balance_after, created_at |

---

## 10. Antigravity Build Guide

> **This section contains the complete prompt-by-prompt build guide for constructing InvenTiX using Antigravity Agentic IDE. Follow every prompt in sequence. One prompt = one task. Never combine. Test after every prompt before proceeding.**

### 10.1 Setup — Before You Start

**Install on your machine:**

- Node.js v18+ → nodejs.org
- Git → git-scm.com
- VS Code → code.visualstudio.com
- Python 3.10+ → python.org

**Create free accounts:**

| **Service** | **URL** |
|---|---|
| MongoDB Atlas | mongodb.com/atlas — free 512MB cluster for database |
| Railway | railway.app — free backend hosting |
| Vercel | vercel.com — free frontend hosting |
| Google AI Studio | aistudio.google.com — Gemini API key (free) for AI features |

**Create your project folder:**

```bash
mkdir inventix && cd inventix
```

Drop `CONTEXT.md` into this folder. Point Antigravity at it. This is your workspace root.

### 10.2 SESSION OPENER — Paste This Every Single Time

Every time you open Antigravity, paste this FIRST before anything else:

```
Read CONTEXT.md in the project root. This is the full spec for InvenTiX — a B2B Fashion Inventory Intelligence Platform for Indian manufacturers and wholesalers.

Confirm you understand by listing:
(1) The 5 core intelligence engines
(2) The full tech stack
(3) The two main dashboard views

Then stop and wait for my next instruction. Do not build anything yet.
```

Wait for Antigravity to confirm correctly before continuing. If it gets anything wrong say: *"That is wrong. Re-read CONTEXT.md and try again."*

---

### PHASE 0 — Project Scaffold (Day 1 Morning)

#### Prompt 0-A: Create full folder structure

```
Read CONTEXT.md. Create the complete folder structure for InvenTiX.

Folders to create:
/inventix-backend/ — Node.js + Express API
/inventix-frontend/ — React + TypeScript
/inventix-ml/ — Python FastAPI ML microservice

Inside /inventix-backend/: routes/, models/, services/, middleware/, config/
Inside /inventix-frontend/src/: components/, pages/, hooks/, store/, types/, utils/
Inside /inventix-frontend/src/components/: seller/, admin/, shared/, charts/
Inside /inventix-ml/: demand/, anomaly/, simulation/

Create all folders and all empty placeholder files exactly as listed.
Do not write any code inside the files yet.
After creating, list every file path you created.
```

#### Prompt 0-B: Backend setup

```
Read CONTEXT.md. Set up the backend only. Do exactly 3 things:

1. Create inventix-backend/package.json with:
   name: "inventix-backend", type: "module"
   scripts: { start: "node server.js", dev: "node --watch server.js" }
   dependencies: express, pg, socket.io, dotenv, cors, bcrypt, jsonwebtoken, multer, csv-parse

2. Create inventix-backend/.env.example with:
   DATABASE_URL=
   JWT_SECRET=
   PORT=5000
   ML_SERVICE_URL=http://localhost:8000
   FRONTEND_URL=http://localhost:3000

3. Create inventix-backend/server.js that:
   - Imports express, http, socket.io, dotenv, cors
   - Creates Express app with cors() and express.json() middleware
   - Creates HTTP server and attaches Socket.IO with cors origin: "*"
   - Adds GET /api/health route returning { status: "ok", service: "inventix-api", timestamp: new Date() }
   - Starts server on PORT env variable, logs "InvenTiX API running on port X"

Do nothing else.

After: copy .env.example to .env, fill in DATABASE_URL. Run: cd inventix-backend && npm install && npm run dev. Visit localhost:5000/api/health — should see { status: ok }.
```

---

### PHASE 1 — Database Models (Day 1 Afternoon)

#### Prompt 1-A: All PostgreSQL table schemas

```
Read CONTEXT.md Section 9 (Core Data Model). Create inventix-backend/config/schema.sql.

Create these tables in order (respecting foreign key dependencies):

1. manufacturers — id (UUID PK), name, city, state, category_focus, tier, created_at
2. retailers — id (UUID PK), name, city, state, credit_limit DECIMAL, credit_used DECIMAL DEFAULT 0, risk_score INT DEFAULT 0, created_at
3. skus — id (UUID PK), manufacturer_id (FK), name, category, season, base_price DECIMAL, active BOOLEAN DEFAULT true, created_at
4. sku_variants — id (UUID PK), sku_id (FK), colour, size, current_stock INT DEFAULT 0, last_updated
5. shipments — id (UUID PK), manufacturer_id (FK), retailer_id (FK), shipped_at, total_units INT, credit_terms_days INT DEFAULT 45
6. shipment_lines — id (UUID PK), shipment_id (FK), variant_id (FK), quantity_shipped INT
7. sell_through_events — id (UUID PK), variant_id (FK), retailer_id (FK), units_sold INT, sold_at, source VARCHAR
8. stock_updates — id (UUID PK), variant_id (FK), updated_by UUID, quantity_delta INT, reason_code VARCHAR, ip_address VARCHAR, created_at
9. anomaly_flags — id (UUID PK), entity_type VARCHAR, entity_id UUID, anomaly_type VARCHAR, severity VARCHAR, status VARCHAR DEFAULT pending, notes TEXT, created_at
10. credit_events — id (UUID PK), retailer_id (FK), manufacturer_id (FK), event_type VARCHAR, amount DECIMAL, balance_after DECIMAL, created_at
11. users — id (UUID PK), email VARCHAR UNIQUE, password_hash VARCHAR, role VARCHAR CHECK (role IN (manufacturer,retailer,admin)), entity_id UUID, created_at

Add appropriate indexes on: manufacturer_id, retailer_id, variant_id, sold_at, created_at for all tables that have them.
Do nothing else.
```

#### Prompt 1-B: Seed database with realistic Indian fashion data

```
Read CONTEXT.md. Create inventix-backend/config/seed.js that inserts realistic Indian B2B fashion data.

Insert exactly:
- 3 manufacturers: { Surat Kurti House (Surat, ethnic wear, tier 1), Tirupur Basics Co (Tirupur, knitwear, tier 2), Delhi Fast Fashion (Delhi, western, tier 1) }
- 8 retailers spread across: Pune, Coimbatore, Jaipur, Chennai, Hyderabad, Kolkata, Bengaluru, Ahmedabad — each with credit_limit between 200000 and 800000, starting credit_used 0
- 5 SKUs per manufacturer (15 total) with realistic Indian fashion names: e.g. "Bandhani Kurti SS25", "Cotton Stripe Tee FW25", "Rayon Salwar Set Festival Drop"
- For each SKU, 5 variants (S, M, L, XL, XXL) in 2 colours each = 10 variants per SKU = 150 variants total — starting stock between 50 and 200
- 20 historical sell-through events spread across the last 60 days — simulate M and L selling 3x faster than XL and XXL
- 3 anomaly flags in pending status: one ghost_restock, one sudden_stock_spike, one zero_sell_through_cliff

Log counts after insert. Add script in package.json: "seed": "node config/seed.js"
Do nothing else.
```

---

### PHASE 2 — Backend APIs (Day 2 Morning)

#### Prompt 2-A: Authentication routes

```
Read CONTEXT.md. Create inventix-backend/routes/auth.js.

Implement 3 routes:

1. POST /api/auth/register — accepts { email, password, role, entity_id } — hashes password with bcrypt (12 rounds) — saves to users table — returns JWT token + user object (no password)

2. POST /api/auth/login — accepts { email, password } — validates against DB — returns JWT token + user object with role and entity_id

3. GET /api/auth/me — protected route — reads JWT from Authorization Bearer header — returns current user object

Create inventix-backend/middleware/auth.js — middleware that verifies JWT and attaches decoded user to req.user. Export: requireAuth (any logged in user), requireRole(...roles) (role-specific guard).

Register the auth router in server.js under /api/auth.
Do nothing else.
```

#### Prompt 2-B: Inventory + SKU routes

```
Read CONTEXT.md. Create inventix-backend/routes/inventory.js.

Implement these routes (all require requireAuth middleware):

1. GET /api/inventory — returns all SKUs and their variants for the logged-in manufacturer (filter by manufacturer_id from req.user.entity_id) — include current_stock, last_updated, sell_through_rate (calculated: units sold in last 30 days / quantity_shipped in last 30 days)

2. POST /api/inventory/update — accepts { variant_id, quantity_delta, reason_code } — inserts stock_update record with ip_address from req.ip — updates sku_variants.current_stock — emits "stock_update" via Socket.IO with full update payload — returns updated variant

3. POST /api/inventory/bulk-upload — accepts multipart CSV file — uses csv-parse to read rows — validates: SKU name, colour, size, quantity, reason_code columns must exist — inserts valid rows as stock_updates — returns { success: N, errors: [list of row errors] }

4. GET /api/inventory/:sku_id/timeline — returns last 50 stock_update records for all variants of a given SKU, sorted by created_at desc

Register router in server.js under /api/inventory.
Do nothing else.
```

#### Prompt 2-C: Retailer and sell-through routes

```
Read CONTEXT.md. Create inventix-backend/routes/retailers.js.

Implement these routes:

1. GET /api/retailers — returns all retailers for this manufacturer with: total_units_held, sell_through_rate (last 30 days), days_since_last_sale, estimated_weeks_cover, risk_score, credit_used, credit_limit, health_status (green/yellow/red computed from sell_through_rate thresholds: green > 0.6, yellow 0.3–0.6, red < 0.3)

2. GET /api/retailers/:id — returns single retailer with full SKU-level breakdown: each variant shipped to them, units remaining, sell-through rate, last sale date

3. POST /api/retailers/:id/sell-through — accepts { variant_id, units_sold, sold_at } — inserts sell_through_events record — recalculates retailer health_status — emits "sell_through_update" via Socket.IO — returns updated retailer summary

4. GET /api/retailers/:id/credit — returns full credit event history for this retailer-manufacturer pair with running balance

Register router in server.js under /api/retailers.
Do nothing else.
```

#### Prompt 2-D: Alerts routes

```
Read CONTEXT.md. Create inventix-backend/services/alertEngine.js.

This service runs every hour using a setInterval. On each run it:
1. Dead Stock Check — query all sku_variants where: retailer currently holds stock AND last sell_through_event for that variant at that retailer is older than 14 days — for each: insert anomaly_flag with type "dead_stock_warning", severity "medium"
2. Low Stock Check — query all sku_variants where current_stock < 20 — for each: log a low_stock alert (no DB insert — just Socket.IO emit "alert" with { type: "low_stock", variant_id, current_stock })
3. Credit Risk Check — query retailers where (credit_used / credit_limit) > 0.7 AND sell_through_rate < 0.3 — for each: insert anomaly_flag with type "credit_risk", severity "high" — emit Socket.IO "alert"

Export startAlertEngine() function. Call it from server.js after startup.
Create GET /api/alerts route that returns all anomaly_flags for manufacturer in last 30 days, sorted by created_at desc.
Do nothing else.
```

#### Prompt 2-E: Admin routes

```
Read CONTEXT.md. Create inventix-backend/routes/admin.js. All routes require requireRole("admin") middleware.

1. GET /api/admin/feed — returns last 100 stock_update events across ALL manufacturers, joined with user info and variant info, sorted by created_at desc — this is the real-time activity feed

2. GET /api/admin/anomalies — returns all anomaly_flags with status "pending", sorted by severity (critical first) then created_at

3. POST /api/admin/anomalies/:id/resolve — accepts { action: "approve"|"reject"|"escalate"|"freeze", reason } — updates anomaly_flag status and notes — if action is "freeze": set sku_variants.current_stock to -1 as a freeze flag — emits Socket.IO "anomaly_resolved" event

4. GET /api/admin/analytics — returns: top 5 categories by sell-through rate, top 5 fastest-moving sizes platform-wide, top 5 retailers by credit risk score, platform-wide dead_stock_count

5. GET /api/admin/audit — accepts query params: user_id, entity_id, date_from, date_to — returns filtered stock_update records with full audit fields

Register router in server.js under /api/admin.
Do nothing else.
```

---

### PHASE 3 — ML Microservice (Day 2 Afternoon)

#### Prompt 3-A: Python FastAPI setup

```
Read CONTEXT.md. Set up the ML microservice only. Create these files:

1. inventix-ml/requirements.txt with: fastapi, uvicorn, pandas, numpy, scikit-learn, prophet, psycopg2-binary, python-dotenv

2. inventix-ml/.env.example with: DATABASE_URL=

3. inventix-ml/main.py that:
   - Creates FastAPI app
   - Adds GET /health route returning { status: "ok", service: "inventix-ml" }
   - Imports and includes routers from: demand.router, anomaly.router, simulation.router
   - Starts with uvicorn on port 8000

4. inventix-ml/db.py that: loads DATABASE_URL from env, creates a psycopg2 connection helper function get_db() that returns a connection.

Do nothing else.
```

#### Prompt 3-B: Demand forecasting endpoint

```
Read CONTEXT.md. Create inventix-ml/demand/router.py.

Implement POST /demand/forecast:
- Input body: { variant_id: str, retailer_id: str, weeks_ahead: int = 8 }
- Fetch last 90 days of sell_through_events for this variant+retailer from PostgreSQL
- If fewer than 14 data points: return { forecast: null, reason: "insufficient_data", weeks_ahead }
- If 14+ data points: use Facebook Prophet — fit model, predict next N weeks — return { forecast: [ { week: 1, predicted_units: X, lower: Y, upper: Z }, ... ], confidence: "medium"|"high" based on data volume }

Implement GET /demand/restock-signals:
- Query all variant+retailer pairs where: stock_at_retailer (estimated from shipments - sell_through) divided by avg weekly sell rate < 3 weeks
- Return list of { variant_id, retailer_id, weeks_of_cover, recommended_restock_qty, urgency: "urgent"|"soon"|"monitor" }

Do nothing else.
```

#### Prompt 3-C: Anomaly detection endpoint

```
Read CONTEXT.md. Create inventix-ml/anomaly/router.py.

Implement POST /anomaly/scan:
- Input: { manufacturer_id: str }
- Fetch last 30 days of stock_updates for this manufacturer
- Run Isolation Forest (scikit-learn) on features: quantity_delta, frequency_per_sku, time_between_updates
- Flag records where anomaly_score < -0.3 as suspicious
- For each flagged record, determine type: if quantity_delta > 5x median → "sudden_stock_spike"; if same sku updated 3+ times with negative delta → "repeated_damage"
- Return { anomalies: [ { stock_update_id, variant_id, anomaly_type, score, detected_at } ] }

Implement GET /anomaly/risk-scores:
- For each manufacturer on platform: compute composite risk score (0-100) from: anomaly_flag_count in last 30 days (weight 40%), return_rate vs platform avg (weight 30%), credit default events (weight 30%)
- Return list sorted by risk_score desc

Do nothing else.
```

#### Prompt 3-D: Simulation engine endpoint

```
Read CONTEXT.md. Create inventix-ml/simulation/router.py.

Implement POST /simulation/run:
- Input body: { manufacturer_id: str, scenario: str, parameters: dict }
- Scenarios to handle:

"demand_spike": parameters = { demand_multiplier: float (1.1 to 4.0) }
  - Fetch all current stock levels for manufacturer
  - Multiply avg weekly demand by demand_multiplier
  - Calculate: which SKUs hit zero stock within 4 and 8 weeks, total revenue at risk
  - Return: { stockouts_in_4_weeks: [...], stockouts_in_8_weeks: [...], revenue_at_risk: float, recommended_actions: [...] }

"supply_delay": parameters = { delay_days: int (1 to 30) }
  - For each variant with pending restock: calculate if it hits zero before delayed restock arrives
  - Return: { variants_at_risk: [...], estimated_revenue_loss: float, allocation_priority: [...] }

"festival_surge": parameters = { festival: str, weeks_until: int }
  - Apply festival multipliers: Diwali 2.5x ethnic, 1.5x western; Navratri 3x ethnic; Eid 2x all
  - Calculate: recommended_prebuild quantities by variant, risk of stockout if no action taken
  - Return: { by_variant: [...], total_units_to_prebuild: int, risk_without_action: "high"|"medium"|"low" }

"retailer_default": parameters = { retailer_ids: [str] }
  - Sum credit_used for those retailers
  - Estimate inventory at return risk from their current holdings
  - Return: { credit_exposure: float, inventory_return_risk_units: int, working_capital_impact: float }

Return all scenarios as: { scenario, parameters, risk_level: "red"|"yellow"|"green", summary: str, details: {} }
Do nothing else.
```

---

### PHASE 4 — Frontend Foundation (Day 3 Morning)

#### Prompt 4-A: React + TypeScript + Tailwind setup

```
Read CONTEXT.md. Set up the frontend only.

1. In inventix-frontend/, run: npm create vite@latest . -- --template react-ts

2. Install: npm install tailwindcss postcss autoprefixer @tailwindcss/forms recharts d3 socket.io-client framer-motion lucide-react axios @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip

3. Configure tailwind.config.js with custom theme:
   colors: {
     navy: { 900: "#0D1B2A", 800: "#1A2744", 700: "#243357" },
     electric: { DEFAULT: "#00C2FF", dark: "#0099CC" },
     violet: { DEFAULT: "#7B2FBE" },
     mint: { DEFAULT: "#00E5A0" },
     amber: { DEFAULT: "#FFB800" },
     danger: { DEFAULT: "#FF4757" },
   }
   fontFamily: { sans: ["Inter", "sans-serif"], mono: ["JetBrains Mono", "monospace"] }

4. Create src/index.css with: @import url for Inter and JetBrains Mono from Google Fonts. Set body background to #0D1B2A.

5. Create src/lib/api.ts — axios instance with baseURL from VITE_API_URL env var, JWT token auto-attached from localStorage.

6. Create src/lib/socket.ts — socket.io-client instance connecting to VITE_API_URL.

Do nothing else.
```

#### Prompt 4-B: Global layout, sidebar, auth context

```
Read CONTEXT.md Section 8 (UI Design Vision). Create the global app shell.

1. src/contexts/AuthContext.tsx — React context with: { user, token, login(email,password), logout(), isLoading } — stores JWT in localStorage — fetches /api/auth/me on load

2. src/components/shared/Layout.tsx — full-page dark layout:
   - Left sidebar 240px fixed: InvenTiX logo (electric cyan), nav links with icons (lucide-react), role badge pill at bottom, animated active indicator
   - Top bar: breadcrumb, live status dot (animated green pulse), notifications bell with unread count badge, user avatar + role
   - Main content area: flex-1, overflow-y-auto, p-6, dark background

3. src/components/shared/Sidebar.tsx — nav items:
   - SELLER view: Dashboard, Inventory, Retailers, Alerts, Forecasts, Simulation
   - ADMIN view: Activity Feed, Anomalies, Analytics, Audit Log, Risk Scores
   - Role-switcher toggle at bottom of sidebar

4. src/pages/Login.tsx — centered dark login card, email + password inputs styled in dark theme, InvenTiX logo centered above

5. Update src/App.tsx — React Router routes: / → Login if not authed, /seller/* → seller pages, /admin/* → admin pages, route guard based on role.

All components must use the dark color palette from CONTEXT.md. No white backgrounds anywhere.
Do nothing else.
```

---

### PHASE 5 — Seller Dashboard Pages (Day 3 Afternoon)

#### Prompt 5-A: Inventory Command Table page

*(Create `src/pages/seller/Inventory.tsx` with top stat bar, filter bar, virtual-scroll inventory table with expandable rows, Update Stock modal, and Bulk Upload CSV button.)*

#### Prompt 5-B: Live Retailer Stock Map page

*(Create `src/pages/seller/Retailers.tsx` with split-panel layout — scrollable retailer health tiles on left, SKU-level drill-down on right, real-time Socket.IO updates.)*

#### Prompt 5-C: Alerts Centre page

*(Create `src/pages/seller/Alerts.tsx` with summary count cards, severity-badged alert feed, filter tabs, and live Socket.IO slide-in animations.)*

#### Prompt 5-D: Demand Forecasts page

*(Create `src/pages/seller/Forecasts.tsx` with Restock Signals table and SKU-level Recharts forecast with confidence bands.)*

#### Prompt 5-E: Simulation Mode page

*(Create `src/pages/seller/Simulation.tsx` — two-column layout: scenario sliders on left, animated D3 risk gauge + impact table + recommended actions on right.)*

#### Prompt 5-F: Size-Colour Velocity Heatmap component

*(Create `src/components/charts/SizeColourHeatmap.tsx` — D3 heatmap, cool-to-cyan sell-through scale, pulsing red borders on dead sizes, colour filter dropdown.)*

---

### PHASE 6 — Admin Dashboard Pages (Day 4 Morning)

#### Prompt 6-A: Admin Activity Feed + Anomaly Panel

*(Create `src/pages/admin/ActivityFeed.tsx` and `src/pages/admin/Anomalies.tsx` — real-time Socket.IO feed, anomaly detail panel with Approve / Reject / Escalate / Freeze actions.)*

#### Prompt 6-B: Admin Analytics + Risk Scores page

*(Create `src/pages/admin/Analytics.tsx` — 2×2 grid: category bar chart, size radar chart, platform-wide heatmap, retailer risk leaderboard.)*

---

### PHASE 7 — Polish, Integration & Demo Prep (Day 4 Afternoon)

#### Prompt 7-A: Seller Dashboard home page

*(Create `src/pages/seller/Dashboard.tsx` — hero stat cards, curated alert list, credit exposure D3 gauge, 30-day sell-through area chart, top/bottom SKU lists with Framer Motion animations.)*

#### Prompt 7-B: Wire Socket.IO live updates end-to-end

*(Wire all four Socket.IO events across backend routes and frontend components with the `useSocket` hook.)*

#### Prompt 7-C: Final polish — loading, error, and empty states

*(Add `LoadingSpinner`, `ErrorCard`, `EmptyState` shared components across all pages; Framer Motion page transitions; mobile sidebar collapse.)*

#### Prompt 7-D: Deployment

```
1. inventix-frontend/: Create vercel.json — rewrites so all routes go to /index.html
2. inventix-backend/: Procfile for Railway: "web: node server.js"
3. inventix-ml/: Procfile for Railway: "web: uvicorn main:app --host 0.0.0.0 --port $PORT"

inventix-frontend/.env.production:
   VITE_API_URL=https://your-railway-backend-url.railway.app

inventix-backend/.env on Railway:
   DATABASE_URL=your-postgresql-url
   ML_SERVICE_URL=https://your-railway-ml-url.railway.app
   FRONTEND_URL=https://your-vercel-url.vercel.app
   JWT_SECRET=inventix_secret_2025

After deployment:
1. Run seed script against production database
2. Test login at Vercel URL
3. Test a stock update and verify live update fires
4. Test simulation mode end-to-end
```

---

## 11. Hackathon Win Strategy

### 11.1 Why InvenTiX Wins

- **Massive real pain** — 30% of all Indian fashion inventory goes unsold annually. This is not a hypothetical problem. Every judge from the industry has lived it.
- **India-specific** — the credit-based wholesale model (udhari) is uniquely Indian and completely unaddressed by every Western tool (JOOR, Faire, NuORDER) competing in this space.
- **Post-shipment gap** — nobody has solved visibility after goods ship in Indian B2B fashion. This is the white space InvenTiX owns.
- **Directly maps to the Problem Statement** — inventory tracking, admin oversight, anomaly detection, audit logs, behaviour-based automations — every PS requirement is covered with depth.
- **Buildable and demoable** — the simulation mode, live retailer map, and real-time anomaly feed make for an extraordinary demo experience that judges will remember.
- **UI that feels real** — dark, high-information-density design borrowed from Bloomberg, Linear, and Stripe — not the generic light-mode AI dashboard every other team will build.

### 11.2 Demo Flow — 5 Minutes to Win

| **Time** | **Action** |
|---|---|
| 0:00 — 0:30 | Open Seller Dashboard. Show the hero stat cards — dead stock count, credit exposure gauge, alerts. Let the numbers tell the story. |
| 0:30 — 1:30 | Navigate to Retailer Stock Map. Click a RED retailer tile. Show the SKU breakdown — XL and XXL stalled, M and L gone. Say: *"This is what a return looks like 3 weeks before it happens."* |
| 1:30 — 2:30 | Navigate to Simulation Mode. Select "Festival Surge — Diwali". Set 8 weeks to festival. Hit Run. Watch the risk gauge animate to RED. Show recommended pre-build quantities. Say: *"This is a manufacturer making a crores decision in 10 seconds."* |
| 2:30 — 3:30 | Switch to Admin view. Show the Anomaly feed — a pending ghost_restock flagged by Isolation Forest. Click Freeze SKU. Show confirmation. Say: *"Platform-level fraud prevention, automated."* |
| 3:30 — 4:30 | Show the Size-Colour Heatmap. Point to XL/XXL dead cells with pulsing red borders. Say: *"Every manufacturer in Surat is shipping the wrong set ratios. InvenTiX fixes that."* |
| 4:30 — 5:00 | Close on the Seller Dashboard. Say: *"InvenTiX gives Indian fashion manufacturers downstream visibility for the first time. Not a dashboard. A decision engine."* |

---

**Built to Win.**

*InvenTiX — Sell-Through Intelligence for Indian B2B Fashion*

*Problem Statement 1 · Domain: Fashion & Merchandising Digital Operations*

*Confidential | Hackathon Submission*

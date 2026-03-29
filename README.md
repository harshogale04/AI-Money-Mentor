# AI Money Mentor 
### ET AI Hackathon 2026 — Problem Statement #9

> India's most comprehensive AI-powered personal finance platform. 6 specialised agents. Built for the 95% of Indians who have no financial plan.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![LangGraph](https://img.shields.io/badge/LangGraph-0.2.45-blue?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)

---

## What it does

AI Money Mentor gives every Indian retail investor access to the kind of financial intelligence previously reserved for HNI clients of wealth management firms — at zero cost.

| Agent | What it does |
|---|---|
| FIRE Planner | Month-by-month retirement roadmap, corpus math, SIP targets per goal |
| Health Score | 0–100 financial wellness score across 6 dimensions in 5 minutes |
| Life Event Advisor | Personalised advice for bonus, inheritance, marriage, new baby, job change |
| Tax Wizard | Upload Form 16 → old vs new regime comparison + every deduction you're missing |
| Couple's Planner | Joint HRA, NPS, SIP optimisation across both incomes |
| MF X-Ray | Upload CAMS PDF → XIRR, fund overlap, expense drag, rebalancing plan |

---

## Tech stack

**Backend**
- Python 3.11 · FastAPI 0.115 · Uvicorn
- LangChain 0.3.7 · LangGraph 0.2.45
- Google Gemini 1.5 Flash (`langchain-google-genai`)
- Supabase (PostgreSQL) for persistence
- Custom India tax engine (FY 2024-25) · Custom XIRR calculator (scipy)
- pdfplumber for CAMS + Form 16 PDF parsing

**Frontend**
- Next.js 14 · TypeScript · Tailwind CSS
- Recharts for data visualisation
- react-dropzone for PDF uploads

---

## Architecture

```
Frontend (Next.js)
      ↓  REST / SSE
FastAPI Gateway
      ↓
LangGraph Orchestrator  ←  intent classifier → routes to agent
      ↓
┌──────────┬──────────┬───────────┬──────────┬──────────┬──────────┐
│  FIRE    │  Health  │   Life    │   Tax    │ Couple's │ MF X-Ray │
│ Planner  │  Score   │   Event   │  Wizard  │ Planner  │          │
└──────────┴──────────┴───────────┴──────────┴──────────┴──────────┘
      ↓  Shared tool layer
      │  Gemini API · PDF parser · XIRR calc · Tax engine
      ↓
Supabase (PostgreSQL)
```

---

## Project structure

```
ai-money-mentor/
├── backend/
│   ├── agents/
│   │   ├── base.py               # Shared base class
│   │   ├── fire_planner.py
│   │   ├── health_score.py
│   │   ├── life_event.py
│   │   ├── tax_wizard.py
│   │   ├── couples_planner.py
│   │   └── mf_xray.py
│   ├── api/routes/
│   │   └── agents.py             # All FastAPI endpoints
│   ├── core/
│   │   ├── config.py             # Pydantic settings
│   │   ├── llm.py                # Gemini client
│   │   ├── supabase.py           # Supabase client
│   │   └── orchestrator.py      # LangGraph state machine
│   ├── models/
│   │   ├── schemas.py            # All Pydantic models
│   │   └── supabase_schema.sql  # Run this in Supabase SQL editor
│   ├── parsers/
│   │   └── pdf_parser.py         # CAMS + Form 16 parser
│   ├── tools/
│   │   ├── xirr.py               # Custom XIRR (scipy)
│   │   └── tax_calculator.py     # India tax engine FY 2024-25
│   ├── main.py
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── app/
        │   ├── dashboard/        # Overview page
        │   ├── fire/             # FIRE planner
        │   ├── health-score/
        │   ├── life-event/
        │   ├── tax-wizard/
        │   ├── couples-planner/
        │   └── mf-xray/
        ├── components/layout/
        │   └── Sidebar.tsx
        └── lib/
            └── api.ts            # Typed API client
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Gemini API key](https://aistudio.google.com)

---

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `backend/models/supabase_schema.sql`
3. Go to **Settings → API** and copy your Project URL and anon/service keys

---

### 2. Backend

```bash
cd backend

# Copy and fill in environment variables
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
SECRET_KEY=any_random_string
```

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`

---

### 3. Frontend

```bash
cd frontend

# Copy and fill in environment variables
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

```bash
npm install
npm run dev
```

App available at: `http://localhost:3000`

---

### 4. Docker (optional)

```bash
# Fill in both .env files first, then:
docker-compose up --build
```

---

## API reference

```
POST   /api/v1/users                         Create user profile
GET    /api/v1/users/{id}                    Get user profile

POST   /api/v1/agents/mf-xray/upload        Upload CAMS/KFintech PDF
POST   /api/v1/agents/mf-xray/manual        Manual portfolio JSON

POST   /api/v1/agents/tax/upload             Upload Form 16 PDF
POST   /api/v1/agents/tax/manual             Manual salary input

POST   /api/v1/agents/health-score           Compute health score
GET    /api/v1/agents/health-score/{id}/history

POST   /api/v1/agents/fire                   FIRE plan
POST   /api/v1/agents/life-event             Life event advice
POST   /api/v1/agents/couples                Joint couple plan
POST   /api/v1/agents/couples/link           Link two partner profiles
```

---

## Test data

Sample PDFs for testing are available in the repo:

- `CAMS_Statement.pdf` — 3-fund portfolio (Axis Bluechip, Mirae Asset, Parag Parikh)
- `Form16.pdf` — Salary ₹12L, with 80C/80D/NPS deductions

For MF X-Ray manual testing, use the `/api/v1/agents/mf-xray/manual` endpoint via Swagger at `/docs`.

---

## Impact model

| Metric | Estimate |
|---|---|
| Tax saved per user/year | ₹25,000 avg |
| Expense ratio savings | ₹5,000/year on ₹5L portfolio |
| Couples joint tax optimisation | ₹66,000/year |
| Time saved per user/year | 20–30 hours |
| Financial advisor fee replaced | ₹25,000/year |
| At 1 lakh users — aggregate tax saving | ₹250 crore/year |

India has 14 crore+ demat accounts. 95% of Indians have no financial plan. AI Money Mentor makes institutional-grade financial intelligence accessible to everyone.

---

## Team

Built for **ET AI Hackathon 2026** · Problem Statement #9 — AI Money Mentor

Powered by Gemini · LangGraph · Supabase

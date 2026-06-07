# Omni-Channel Feedback Agent

Memory-Augmented (RAG) Continuous Feedback Analysis Engine.

## Architecture

```
┌─────────────┐    POST /api/ingest    ┌──────────────────────────┐
│  Next.js 14 │ ──────────────────────▶│  FastAPI + LangGraph     │
│  (Frontend) │    GET  /api/trends    │                          │
│             │ ◀──────────────────────│  Extract → Memorize      │
└─────────────┘                        │  Trend_Analysis          │
                                       │                          │
                                       │  Gemini 1.5 Flash        │
                                       └──────────┬───────────────┘
                                                   │
                                       ┌───────────▼───────────────┐
                                       │  Supabase (PostgreSQL)    │
                                       │  feedback_memory table    │
                                       └───────────────────────────┘
```

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| AI Engine | Google Gemini 1.5 Flash (LangChain) |
| Backend   | Python, FastAPI, LangGraph          |
| Database  | Supabase (PostgreSQL)               |
| Frontend  | Next.js 14, Tailwind CSS v4         |
| UI Libs   | Framer Motion, Recharts, Lucide     |

## Setup

### 1. Database
Run `supabase_schema.sql` in your Supabase SQL Editor.

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Fill in your keys
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## API Routes

| Method | Route         | Description                              |
|--------|---------------|------------------------------------------|
| POST   | /api/ingest   | Analyze + store feedback in Supabase     |
| GET    | /api/trends   | AI trend analysis on last 50 data points |
| GET    | /api/health   | Health check                             |

## Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
GOOGLE_API_KEY=your-gemini-key
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

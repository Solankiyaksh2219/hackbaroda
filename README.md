<p align="center">
  <img src="https://img.shields.io/badge/AI%20Powered-Gemini%201.5-blue?style=for-the-badge&logo=google&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Frontend-Next.js%2016-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Orchestration-LangGraph-FF6F00?style=for-the-badge" alt="LangGraph">
</p>

# 🧠 FeedbackHub — Omni-Channel Feedback Analysis Agent

> **Memory-Augmented (RAG) Continuous Feedback Analysis Engine** built for [HackBaroda](https://hackbaroda.com).

FeedbackHub is an AI-powered platform that ingests customer feedback from multiple channels (Reddit, Discord, Twitter/X, Surveys, Support tickets), performs real-time sentiment analysis & theme extraction using **Google Gemini**, and generates strategic product initiatives using **RAG-based trend analysis** over your feedback history.

---

## ✨ Key Features

- 🎯 **Multi-Source Ingestion** — Analyze feedback from Reddit, Discord, Twitter/X, Surveys & Support
- 🤖 **AI Sentiment Analysis** — Real-time sentiment scoring (0-100) powered by Gemini 1.5 Flash
- 🏷️ **Theme Extraction** — Automatically identifies top recurring themes from feedback
- 📈 **Sentiment Trajectory** — Interactive charts tracking sentiment trends over time
- 🧠 **RAG-Powered Insights** — Generates actionable product initiatives from feedback memory
- 📊 **Live Dashboard** — Beautiful, responsive UI with real-time data visualization
- 💾 **Persistent Memory** — All feedback stored in Supabase for continuous learning

---

## 🏗️ Architecture

```
┌─────────────────────┐     POST /api/ingest     ┌────────────────────────────────┐
│                     │ ────────────────────────▶ │                                │
│   Next.js 16        │     GET  /api/trends     │   FastAPI + LangGraph          │
│   (Frontend)        │ ◀──────────────────────  │                                │
│                     │     GET  /api/health     │   ┌──────────┐   ┌───────────┐ │
│  • Recharts         │                          │   │ Extract  │──▶│ Memorize  │ │
│  • Framer Motion    │                          │   └──────────┘   └───────────┘ │
│  • Lucide Icons     │                          │                                │
│  • Tailwind CSS v4  │                          │   ┌──────────────────────────┐ │
└─────────────────────┘                          │   │   Trend Analysis (RAG)   │ │
                                                 │   └──────────────────────────┘ │
                                                 │                                │
                                                 │   Gemini 1.5 Flash             │
                                                 └───────────┬────────────────────┘
                                                              │
                                                 ┌────────────▼────────────────────┐
                                                 │   Supabase (PostgreSQL)         │
                                                 │   feedback_memory table         │
                                                 └─────────────────────────────────┘
```

### LangGraph Pipelines

| Pipeline | Nodes | Purpose |
|----------|-------|---------|
| **Ingest** | `Extract` → `Memorize` | Analyzes feedback text, extracts sentiment + themes, stores in Supabase |
| **Trends** | `Trend_Analysis` | Reads last 50 entries from memory, generates strategic product initiative |

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **AI Engine** | Google Gemini 1.5 Flash (via LangChain) | `langchain-google-genai 2.0.4` |
| **Orchestration** | LangGraph | `0.2.34` |
| **Backend** | Python, FastAPI | `0.115.0` |
| **Database** | Supabase (PostgreSQL) | `supabase-py 2.9.1` |
| **Frontend** | Next.js, React | `16.2.7` / `19.2.4` |
| **Styling** | Tailwind CSS | `v4` |
| **UI Libraries** | Framer Motion, Recharts, Lucide React | Latest |

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & npm
- **Supabase account** ([supabase.com](https://supabase.com))
- **Google AI API key** ([aistudio.google.com](https://aistudio.google.com))

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Solankiyaksh2219/hackbaroda.git
cd hackbaroda
```

### 2️⃣ Set Up the Database

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor
2. Run the contents of `supabase_schema.sql`:

```sql
create extension if not exists "uuid-ossp";

create table if not exists feedback_memory (
  id uuid primary key default uuid_generate_v4(),
  source text not null,
  sentiment_score int not null check (sentiment_score >= 0 and sentiment_score <= 100),
  themes text[] not null default '{}',
  created_at timestamp with time zone default now()
);

create index if not exists idx_feedback_memory_created_at
  on feedback_memory(created_at desc);
```

### 3️⃣ Set Up the Backend

```bash
cd hackbaroda/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
GOOGLE_API_KEY=your-gemini-api-key
```

Start the backend server:

```bash
uvicorn main:app --reload --port 8000
```

### 4️⃣ Set Up the Frontend

```bash
cd hackbaroda/frontend

# Install dependencies
npm install

# (Optional) Configure API URL
# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

### 5️⃣ Open the App

Navigate to **[http://localhost:3000](http://localhost:3000)** 🎉

---

## 📡 API Reference

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| `POST` | `/api/ingest` | Analyze & store feedback | `{ "source": "reddit", "raw_text": "..." }` |
| `GET` | `/api/trends` | Get AI trend analysis + history | — |
| `GET` | `/api/health` | Health check | — |

### Example: Ingest Feedback

```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"source": "reddit", "raw_text": "The new update is great but the app crashes on mobile"}'
```

**Response:**
```json
{
  "status": "ingested",
  "sentiment": 45,
  "themes": ["app-crashes", "mobile-issues", "positive-update"],
  "source": "reddit"
}
```

---

## 📁 Project Structure

```
hackbaroda/
├── backend/
│   ├── main.py              # FastAPI app with CORS & routes
│   ├── graph.py             # LangGraph pipelines (Ingest + Trends)
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment variable template
│   ├── test_api.py          # API tests
│   ├── test_db.py           # Database connection tests
│   └── test_production.py   # Production tests
│
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx         # Main dashboard (530+ lines)
│   │   ├── layout.tsx       # Root layout with fonts
│   │   └── globals.css      # Global styles & Tailwind
│   ├── package.json         # Node dependencies
│   └── next.config.ts       # Next.js configuration
│
├── supabase_schema.sql      # Database schema
└── README.md                # This file
```

---

## 🧩 How It Works

1. **User submits feedback** via the dashboard, selecting a source channel
2. **LangGraph Ingest Pipeline** kicks in:
   - `Extract` node → Gemini analyzes the text, returns sentiment score (0-100) and top 3 themes
   - `Memorize` node → Stores the analysis in Supabase's `feedback_memory` table
3. **Dashboard updates** with new data point on the sentiment chart
4. **User clicks "Generate"** to trigger the Trends pipeline:
   - `Trend_Analysis` node → Fetches last 50 feedback entries from Supabase
   - Gemini synthesizes a strategic, actionable product initiative based on the data
5. **RAG loop** → More feedback = smarter insights over time

---

## 👥 Team

Built with ❤️ for **HackBaroda Hackathon**

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

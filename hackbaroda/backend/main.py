import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from graph import ingest_app, trend_app, get_supabase

app = FastAPI(title="Feedback Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IngestRequest(BaseModel):
    source: str
    raw_text: str

@app.post("/api/ingest")
async def ingest(req: IngestRequest):
    try:
        result = ingest_app.invoke({
            "source": req.source,
            "raw_text": req.raw_text,
            "sentiment": 0,
            "themes": [],
            "actionable_initiative": "",
        })
        return {
            "status": "ingested",
            "sentiment": result["sentiment"],
            "themes": result["themes"],
            "source": result["source"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trends")
async def trends():
    try:
        result = trend_app.invoke({
            "source": "",
            "raw_text": "",
            "sentiment": 0,
            "themes": [],
            "actionable_initiative": "",
        })
        history = (get_supabase()
                   .table("feedback_memory")
                   .select("created_at,sentiment,source,themes")
                   .order("created_at")
                   .limit(50)
                   .execute().data)
        return {
            "actionable_initiative": result["actionable_initiative"],
            "history": history,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health():
    return {"status": "ok"}

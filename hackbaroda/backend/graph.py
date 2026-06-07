import os, json
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel
from supabase import create_client, Client

# --- State ---
class AgentState(TypedDict):
    source: str
    raw_text: str
    sentiment: int
    themes: List[str]
    actionable_initiative: str

# --- Structured Outputs ---
class ExtractOutput(BaseModel):
    sentiment: int
    themes: List[str]

class TrendOutput(BaseModel):
    actionable_initiative: str

# --- Singletons ---
_sb: Client | None = None
def get_supabase() -> Client:
    global _sb
    if not _sb:
        _sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
    return _sb

def get_llm():
    return ChatGoogleGenerativeAI(model="gemini-flash-latest", temperature=0.2)

# --- Nodes ---
def extract(state: AgentState) -> dict:
    llm = get_llm().with_structured_output(ExtractOutput)
    prompt = (
        "You are a feedback analyst. Extract overall sentiment as an integer 0-100 "
        "(0=very negative, 100=very positive) and the top 3 themes as short phrases.\n\n"
        f"Feedback text:\n{state['raw_text']}"
    )
    res = llm.invoke(prompt)
    return {"sentiment": res.sentiment, "themes": res.themes}

def memorize(state: AgentState) -> dict:
    get_supabase().table("feedback_memory").insert({
        "source": state.get("source", "unknown"),
        "sentiment": state["sentiment"],
        "themes": state["themes"],
        "raw_text": state["raw_text"],
    }).execute()
    return {"source": state.get("source", "unknown")}

def trend_analysis(state: AgentState) -> dict:
    rows = (get_supabase()
            .table("feedback_memory")
            .select("*")
            .order("created_at", desc=True)
            .limit(50)
            .execute().data)
    
    summary = json.dumps([{
        "source": r["source"],
        "score": r["sentiment"],
        "themes": r["themes"],
        "date": r["created_at"]
    } for r in rows], indent=1)

    llm = get_llm().with_structured_output(TrendOutput)
    prompt = (
        "You are a strategic product analyst. Given this historical feedback data from "
        "multiple channels, identify:\n"
        "1. The top 3 recurring themes across all sources\n"
        "2. The sentiment trajectory (improving/declining/stable)\n"
        "3. ONE specific, actionable community or product initiative that addresses the data\n\n"
        f"Data:\n{summary}"
    )
    res = llm.invoke(prompt)
    return {"actionable_initiative": res.actionable_initiative}

# --- Graph: Ingest (Extract -> Memorize) ---
g_ingest = StateGraph(AgentState)
g_ingest.add_node("Extract", extract)
g_ingest.add_node("Memorize", memorize)
g_ingest.set_entry_point("Extract")
g_ingest.add_edge("Extract", "Memorize")
g_ingest.add_edge("Memorize", END)
ingest_app = g_ingest.compile()

# --- Graph: Trends (Trend_Analysis) ---
g_trends = StateGraph(AgentState)
g_trends.add_node("Trend_Analysis", trend_analysis)
g_trends.set_entry_point("Trend_Analysis")
g_trends.add_edge("Trend_Analysis", END)
trend_app = g_trends.compile()

from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional, Any
from agents.mf_xray import MFXRayAgent
from agents.tax_wizard import TaxWizardAgent
from agents.health_score import HealthScoreAgent
from agents.fire_planner import FIREAgent
from agents.life_event import LifeEventAgent
from agents.couples_planner import CouplesAgent
from core.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
import json


# ── State ─────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    user_id: Optional[str]
    intent: Optional[str]
    input_data: Optional[Any]
    result: Optional[dict]
    error: Optional[str]


# ── Intent classifier ─────────────────────────────────────────────────────────

INTENT_SYSTEM = """Classify the user's request into exactly one of these intents:
mf_xray, tax_wizard, health_score, fire_planner, life_event, couples_planner

Return only the intent string, nothing else."""

INTENT_MAP = {
    "mf_xray": ["mutual fund", "mf", "cams", "kfintech", "portfolio", "xirr", "overlap", "rebalance"],
    "tax_wizard": ["tax", "form 16", "80c", "regime", "deduction", "itr"],
    "health_score": ["health score", "financial health", "wellness", "score", "how am i doing"],
    "fire_planner": ["retire", "fire", "financial independence", "retirement", "sip", "corpus"],
    "life_event": ["bonus", "inheritance", "marriage", "baby", "job change", "property"],
    "couples_planner": ["couple", "partner", "joint", "spouse", "husband", "wife", "together"],
}


def classify_intent(text: str) -> str:
    text_lower = text.lower()
    for intent, keywords in INTENT_MAP.items():
        if any(k in text_lower for k in keywords):
            return intent
    return "health_score"   # default fallback


# ── Node functions ────────────────────────────────────────────────────────────

async def intent_node(state: AgentState) -> AgentState:
    """Classify the user's intent from their message."""
    if state.get("intent"):
        return state
    input_text = str(state.get("input_data", ""))
    state["intent"] = classify_intent(input_text)
    return state


async def route_node(state: AgentState) -> str:
    """Return the next node name based on intent."""
    return state.get("intent", "health_score")


async def mf_xray_node(state: AgentState) -> AgentState:
    try:
        agent = MFXRayAgent()
        state["result"] = await agent.run(state["input_data"])
    except Exception as e:
        state["error"] = str(e)
    return state


async def tax_wizard_node(state: AgentState) -> AgentState:
    try:
        agent = TaxWizardAgent()
        state["result"] = await agent.run(state["input_data"])
    except Exception as e:
        state["error"] = str(e)
    return state


async def health_score_node(state: AgentState) -> AgentState:
    try:
        agent = HealthScoreAgent()
        state["result"] = await agent.run(state["input_data"])
    except Exception as e:
        state["error"] = str(e)
    return state


async def fire_planner_node(state: AgentState) -> AgentState:
    try:
        agent = FIREAgent()
        state["result"] = await agent.run(state["input_data"])
    except Exception as e:
        state["error"] = str(e)
    return state


async def life_event_node(state: AgentState) -> AgentState:
    try:
        agent = LifeEventAgent()
        state["result"] = await agent.run(state["input_data"])
    except Exception as e:
        state["error"] = str(e)
    return state


async def couples_node(state: AgentState) -> AgentState:
    try:
        agent = CouplesAgent()
        state["result"] = await agent.run(state["input_data"])
    except Exception as e:
        state["error"] = str(e)
    return state


# ── Build graph ───────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("intent", intent_node)
    graph.add_node("mf_xray", mf_xray_node)
    graph.add_node("tax_wizard", tax_wizard_node)
    graph.add_node("health_score", health_score_node)
    graph.add_node("fire_planner", fire_planner_node)
    graph.add_node("life_event", life_event_node)
    graph.add_node("couples_planner", couples_node)

    graph.set_entry_point("intent")

    graph.add_conditional_edges("intent", route_node, {
        "mf_xray": "mf_xray",
        "tax_wizard": "tax_wizard",
        "health_score": "health_score",
        "fire_planner": "fire_planner",
        "life_event": "life_event",
        "couples_planner": "couples_planner",
    })

    for node in ["mf_xray", "tax_wizard", "health_score", "fire_planner", "life_event", "couples_planner"]:
        graph.add_edge(node, END)

    return graph.compile()


# Singleton compiled graph
orchestrator = build_graph()

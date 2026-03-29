from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator
from core.llm import get_llm
from core.supabase import get_supabase
import json


class BaseAgent(ABC):
    def __init__(self):
        self.llm = get_llm()
        self.db = get_supabase()
        self.agent_name = "base"

    @abstractmethod
    async def run(self, input_data: Any) -> dict:
        pass

    async def stream(self, input_data: Any) -> AsyncGenerator[str, None]:
        """Default streaming — subclasses can override."""
        result = await self.run(input_data)
        yield json.dumps(result)

    async def _call_llm(self, system_prompt: str, user_message: str) -> str:
        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ]
        response = await self.llm.ainvoke(messages)
        return response.content

    def _save_session(self, user_id: str, state: dict):
        self.db.table("agent_sessions").upsert({
            "user_id": user_id,
            "agent_type": self.agent_name,
            "state": state,
        }).execute()

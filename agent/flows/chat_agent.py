"""
Chat Flow — LangGraph ReAct Agent
Claude Sonnet 4.6 with Tavily + Perplexity web search and per-user conversation memory.
"""

import os
import httpx
from contextvars import ContextVar
from typing import Annotated

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from flows.vector_store import search_transactions as _vc_search

load_dotenv()

# ─── Per-request user context (safe in async) ────────────────────────────────
# Set before each agent.ainvoke() call; read inside the tool below.
_current_user_id: ContextVar[str] = ContextVar("current_user_id", default="")

# ─── System Prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are StudyBudget AI, a helpful and friendly financial assistant for university students in the UK.

Your role is to help students:
- Understand and analyse their spending habits and bank transactions
- Set realistic budgets and track spending goals
- Find student discounts, deals, and money-saving opportunities
- Explain financial concepts in simple, clear language
- Give practical, actionable saving advice tailored to student life

Guidelines:
- Always use British English and GBP (£) for amounts
- Be encouraging and non-judgmental about spending
- Keep responses concise but informative
- When searching the web, prioritise UK-relevant results
- For financial advice, always note you are an AI assistant and suggest consulting a professional for major decisions
- Remember the conversation history and refer back to it when relevant
"""

# ─── LLM ─────────────────────────────────────────────────────────────────────

llm = ChatAnthropic(
    model="claude-sonnet-4-6",
    anthropic_api_key=os.getenv("CLAUDE_API_KEY"),
    temperature=0.7,
    max_tokens=2048,
)

# ─── Tools ────────────────────────────────────────────────────────────────────

# 1. Tavily Web Search
tavily_search = TavilySearchResults(
    max_results=4,
    search_depth="advanced",
    include_answer=True,
    include_raw_content=False,
    name="web_search",
    description=(
        "Search the web for current information about student finance, deals, "
        "discounts, budgeting tips, and financial news. Use this for up-to-date "
        "information or when you need to find specific facts."
    ),
)


# 2. Transaction History Search (Pinecone RAG)
@tool
def search_my_transactions(query: str) -> str:
    """
    Search the user's personal transaction history using semantic similarity.
    Use this whenever the user asks about their own spending, purchases, or finances —
    for example:
      - "How much did I spend on food last month?"
      - "Show me my Uber transactions"
      - "What did I buy at Amazon recently?"
      - "What's my total entertainment spending?"
    Always call this tool BEFORE answering any question about the user's transactions.

    Args:
        query: Natural language description of what transactions to find.

    Returns:
        A list of matching transactions with date, amount, merchant and category.
    """
    user_id = _current_user_id.get()
    if not user_id:
        return (
            "Transaction history is unavailable in this session. "
            "Please ensure you are logged in."
        )
    try:
        return _vc_search(query, user_id)
    except Exception as exc:
        return f"Unable to search transactions: {exc}"


# 3. Perplexity Deep Search
@tool
def perplexity_search(query: str) -> str:
    """
    Perform a deep web search using Perplexity AI for comprehensive,
    well-sourced answers. Best used for complex financial questions or
    when you need a detailed explanation with citations.

    Args:
        query: The search query or question to research

    Returns:
        A detailed answer with sources from Perplexity
    """
    api_key = os.getenv("PERPLEXITY_API_KEY", "pplx-placeholder-key")

    if api_key == "pplx-placeholder-key":
        return (
            "[Perplexity search unavailable — PERPLEXITY_API_KEY not set. "
            "Falling back to knowledge base.] "
            f"Query was: {query}"
        )

    try:
        response = httpx.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.1-sonar-large-128k-online",
                "messages": [
                    {
                        "role": "system",
                        "content": "Be precise and concise. Focus on UK-relevant information.",
                    },
                    {"role": "user", "content": query},
                ],
                "temperature": 0.2,
                "max_tokens": 1024,
                "return_citations": True,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        data = response.json()
        answer = data["choices"][0]["message"]["content"]

        citations = data.get("citations", [])
        if citations:
            answer += "\n\nSources:\n" + "\n".join(f"- {c}" for c in citations[:3])

        return answer

    except httpx.HTTPStatusError as e:
        return f"Perplexity search failed (HTTP {e.response.status_code}): {e.response.text}"
    except Exception as e:
        return f"Perplexity search error: {str(e)}"


# ─── Memory ───────────────────────────────────────────────────────────────────
# MemorySaver keeps conversation history in-process per thread_id (user session).
# NOTE: history is lost on server restart.
# For persistence, swap with SqliteSaver or PostgresSaver.
memory = MemorySaver()

# ─── Agent ────────────────────────────────────────────────────────────────────

agent = create_react_agent(
    model=llm,
    tools=[search_my_transactions, tavily_search, perplexity_search],
    checkpointer=memory,
    prompt=SYSTEM_PROMPT,
)


# ─── Public API ───────────────────────────────────────────────────────────────

async def chat(message: str, session_id: str) -> str:
    """
    Send a message to the StudyBudget AI agent and return its response.

    Each unique session_id gets its own conversation thread with memory.
    Use the authenticated user's ID as session_id for per-user persistence.

    Args:
        message:    The user's message text.
        session_id: Unique identifier for this conversation (e.g. "user_<id>").

    Returns:
        The agent's text response.
    """
    # Bind user_id so the search_my_transactions tool can filter by namespace.
    _current_user_id.set(session_id)

    config = {"configurable": {"thread_id": session_id}}

    result = await agent.ainvoke(
        {"messages": [HumanMessage(content=message)]},
        config=config,
    )

    return result["messages"][-1].content

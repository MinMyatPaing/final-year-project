"""
Chat Flow — LangGraph ReAct Agent
Claude Sonnet with Tavily + Perplexity web search and per-user conversation memory.
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

SYSTEM_PROMPT = """You are StudyBudget AI, a helpful and friendly assistant for university students in the UK.

Your primary role is helping students manage their finances, but you are a general-purpose assistant
who can answer any question a UK student might have.

Your financial capabilities include:
- Analysing personal spending habits and bank transactions
- Setting realistic budgets and tracking spending goals
- Finding student discounts, deals, and money-saving opportunities
- Explaining financial concepts in simple, clear language
- Giving practical, actionable saving advice tailored to student life

General assistance:
- You can help with questions about UK life, local information, shops, transport, food, and services
- You can answer factual questions, help plan trips, find local businesses, and more
- Use web_search freely whenever a question requires current or local information

Guidelines:
- Always use British English and GBP (£) for financial amounts
- Be encouraging and non-judgmental about spending
- Keep responses concise but informative
- Use web_search whenever you need up-to-date facts, local UK information, or anything you are not certain about — do NOT limit web searches to financial topics
- For financial advice, note you are an AI assistant and suggest consulting a professional for major decisions
- Remember the conversation history and refer back to it when relevant
- When a user asks about their own spending or transactions, ALWAYS call search_my_transactions first
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
    max_results=5,
    search_depth="advanced",
    include_answer=True,
    include_raw_content=False,
    name="web_search",
    description=(
        "Search the web for any up-to-date or local information. "
        "Use this tool freely for: current events, local UK facts (shops, restaurants, "
        "transport, services, locations), student discounts and deals, financial news, "
        "general knowledge questions, or anything you are not certain about. "
        "Do NOT limit searches to financial topics — answer any question where a "
        "web search would give a better or more accurate answer."
    ),
)


# 2. Transaction History Search (Pinecone RAG)
@tool
def search_my_transactions(query: str) -> str:
    """
    Search the user's personal transaction history using semantic similarity.
    ALWAYS call this tool first whenever the user asks about their own spending,
    purchases, income, or finances. For example:
      - "How much did I spend on food last month?"
      - "Show me my Uber transactions"
      - "What did I buy at Amazon recently?"
      - "What's my total entertainment spending?"
      - "How much money did I receive?"

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
    well-sourced answers. Best used for complex questions or when you need
    a detailed explanation with citations. Use web_search first for simpler queries.

    Args:
        query: The search query or question to research

    Returns:
        A detailed answer with sources from Perplexity
    """
    api_key = os.getenv("PERPLEXITY_API_KEY", "")

    if not api_key:
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
    Use the authenticated user's MongoDB ObjectId as session_id so it matches
    the Pinecone namespace used for vector storage.

    Args:
        message:    The user's message text.
        session_id: MongoDB user ObjectId string (matches Pinecone namespace).

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

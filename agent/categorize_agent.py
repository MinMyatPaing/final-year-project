"""
Transaction Categorization Agent using LangGraph
Categorizes transactions into groups like transportation, eat out, etc.
"""

from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage, SystemMessage
import os
from dotenv import load_dotenv

load_dotenv()

# Define the state structure
class CategorizationState(TypedDict):
    transactions: List[Dict[str, Any]]
    categorized_transactions: List[Dict[str, Any]]
    error: str


# Initialize tools
def get_tools():
    """Initialize Tavily search tool"""
    tavily_api_key = os.getenv("TAVILY_API_KEY")
    if tavily_api_key:
        return [TavilySearchResults(max_results=3, tavily_api_key=tavily_api_key)]
    return []


def categorize_transaction(state: CategorizationState) -> CategorizationState:
    """Categorize transactions using OpenAI and Tavily if needed"""
    if state.get("error"):
        return state

    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.1,
        )
        
        tools = get_tools()
        if tools:
            llm_with_tools = llm.bind_tools(tools)
        else:
            llm_with_tools = llm

        categorized = []
        
        # Process transactions in batches for efficiency
        batch_size = 10
        transactions = state["transactions"]
        
        for i in range(0, len(transactions), batch_size):
            batch = transactions[i:i + batch_size]
            
            # Create prompt for batch categorization
            transactions_text = "\n".join([
                f"- {t.get('description', 'N/A')} | Amount: {t.get('amount', 0)} | Date: {t.get('date', 'N/A')}"
                for t in batch
            ])
            
            system_prompt = """You are a financial transaction categorizer. 
            Categorize each transaction into one of these categories:
            - Transportation (Uber, Lyft, gas stations, public transit, parking, car services)
            - Eat Out (restaurants, cafes, fast food, food delivery)
            - Groceries (supermarkets, grocery stores, food markets)
            - Shopping (retail stores, online shopping, clothing, electronics)
            - Entertainment (movies, concerts, streaming services, games)
            - Bills & Utilities (electricity, water, internet, phone, rent)
            - Healthcare (pharmacy, doctor, hospital, medical services)
            - Education (tuition, books, school supplies, courses)
            - Personal Care (haircuts, gym, spa, beauty services)
            - Other (anything that doesn't fit the above categories)
            
            For each transaction, return a JSON object with:
            - All original fields (date, description, amount, balance)
            - category: the category name
            - merchant: the merchant name extracted from description
            
            Return a JSON array of categorized transactions."""

            user_prompt = f"""Categorize these transactions:
            {transactions_text}
            
            Return only a valid JSON array, no other text."""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]
            
            # Use simple LLM without tools for now (works well for most merchants)
            # Tools can be added later if needed for ambiguous merchants
            response = llm.invoke(messages)
            
            # Parse response
            response_text = response.content
            
            # Try to extract JSON from response
            import json
            import re
            
            # Find JSON array in response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                try:
                    batch_categorized = json.loads(json_match.group())
                    if isinstance(batch_categorized, list):
                        categorized.extend(batch_categorized)
                    else:
                        # If single object, wrap in list
                        categorized.append(batch_categorized)
                except json.JSONDecodeError:
                    # Fallback: try to parse the whole response
                    try:
                        batch_categorized = json.loads(response_text)
                        if isinstance(batch_categorized, list):
                            categorized.extend(batch_categorized)
                        else:
                            categorized.append(batch_categorized)
                    except:
                        # If parsing fails, use original transaction with "Other" category
                        for t in batch:
                            categorized.append({
                                **t,
                                "category": "Other",
                                "merchant": t.get("description", "Unknown")[:50]
                            })
            else:
                # If no JSON found, use original transactions with "Other" category
                for t in batch:
                    categorized.append({
                        **t,
                        "category": "Other",
                        "merchant": t.get("description", "Unknown")[:50]
                    })
        
        # Ensure all original transactions are included
        # Match by description and date to avoid duplicates
        final_categorized = []
        seen = set()
        
        for cat_tx in categorized:
            key = (cat_tx.get("description", ""), cat_tx.get("date", ""))
            if key not in seen:
                seen.add(key)
                final_categorized.append(cat_tx)
        
        # Add any missing transactions
        for tx in transactions:
            key = (tx.get("description", ""), tx.get("date", ""))
            if key not in seen:
                final_categorized.append({
                    **tx,
                    "category": "Other",
                    "merchant": tx.get("description", "Unknown")[:50]
                })
        
        state["categorized_transactions"] = final_categorized
        
    except Exception as e:
        state["error"] = f"Error categorizing transactions: {str(e)}"
        import traceback
        traceback.print_exc()
    
    return state


# Build the LangGraph workflow
def create_categorization_workflow():
    """Create the categorization workflow"""
    workflow = StateGraph(CategorizationState)
    
    # Add node
    workflow.add_node("categorize", categorize_transaction)
    
    # Define the flow
    workflow.set_entry_point("categorize")
    workflow.add_edge("categorize", END)
    
    return workflow.compile()


def categorize_transactions(transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Main function to categorize transactions"""
    app = create_categorization_workflow()
    
    initial_state = {
        "transactions": transactions,
        "categorized_transactions": [],
        "error": "",
    }
    
    final_state = app.invoke(initial_state)
    
    if final_state.get("error"):
        raise Exception(final_state["error"])
    
    return final_state["categorized_transactions"]


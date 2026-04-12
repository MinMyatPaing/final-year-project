# StudyBudget — AI-Powered Student Budgeting App

A full-stack budgeting application built for university students. It combines a React Native mobile frontend, an Express.js REST API backend, and a Python AI agent service to help students track spending, upload bank statements, categorise transactions automatically, and chat with a personal finance AI.

---

## Architecture

```
┌─────────────────────────────────┐
│  React Native (Expo) Frontend   │
│  app / components / store       │
└───────────────┬─────────────────┘
                │ HTTP (REST)
                ▼
┌─────────────────────────────────┐
│  Node.js / Express Backend      │
│  Auth · Transactions · Chat     │
│  MongoDB (Mongoose)             │
└───────────────┬─────────────────┘
                │ HTTP (internal)
                ▼
┌─────────────────────────────────┐
│  Python FastAPI Agent Service   │
│  ├── /extract  (PDF → txns)     │
│  ├── /categorize  (LangGraph)   │
│  ├── /chat  (Claude + RAG)      │
│  └── /vectors  (Pinecone sync)  │
└───────┬────────────┬────────────┘
        │            │
   Pinecone      Anthropic / OpenAI
  (vector DB)    (Claude + Embeddings)
```

---

## Features

- **Authentication** — JWT-based register / login with secure HTTP-only cookies
- **Transaction Management** — add individual expenses, view history, delete entries
- **Bank Statement Upload** — upload a PDF bank statement; transactions are extracted automatically using NuExtract and stored in MongoDB
- **AI Categorisation** — every transaction is categorised (Groceries, Transport, Entertainment, etc.) by Claude Haiku 4.5 via a LangGraph workflow
- **Pinecone RAG** — transactions are embedded with `text-embedding-3-small` (1536 dims) and stored per-user in Pinecone namespaces; the chat agent retrieves relevant transactions semantically
- **AI Chat** — conversational financial assistant powered by Claude Sonnet 4.6 with three tools: personal transaction search (Pinecone), Tavily web search, and Perplexity deep search
- **Spending Overview** — pie chart breakdown of spending by category
- **Budget Tracking** — set monthly budgets and track progress

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile frontend | React Native (Expo), NativeWind (Tailwind CSS), Redux Toolkit |
| Backend API | Node.js, Express.js, Mongoose, JWT |
| Database | MongoDB Atlas |
| AI agent service | Python 3.13, FastAPI, LangGraph, Uvicorn |
| LLM (chat) | Anthropic Claude Sonnet 4.6 |
| LLM (categorise) | Anthropic Claude Haiku 4.5 |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Vector database | Pinecone (serverless, one namespace per user) |
| PDF extraction | NuExtract-2.0-2B via Hugging Face |
| Web search | Tavily Search API |
| Package manager (Python) | `uv` |

---

## Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.13
- **uv** — fast Python package manager (`brew install uv` or `pip install uv`)
- **Expo Go** app on your phone (or an iOS/Android simulator)
- **MongoDB Atlas** cluster (free tier is fine)
- **Pinecone** account — create a serverless index named `student-budgeting-final-year` with **1536 dimensions** and cosine metric
- API keys — see Environment Variables below

---

## Project Structure

```
student-budgeting-project-final-year/
├── frontend/          # React Native Expo app
│   ├── app/           # Expo Router file-based routes
│   ├── components/    # Reusable UI components
│   ├── store/         # Redux slices (auth, transactions)
│   └── api/           # Axios client
│
├── backend/           # Node.js / Express REST API
│   ├── controllers/   # Route handlers
│   ├── middleware/     # JWT auth guard
│   ├── models/        # Mongoose schemas (User, Transaction)
│   └── routes/        # Express routers
│
└── agent/             # Python FastAPI AI service
    ├── flows/         # LangGraph workflows
    │   ├── chat_agent.py       # Claude ReAct agent + tools
    │   ├── categorize_agent.py # Batch categorisation workflow
    │   ├── extract_agent.py    # PDF extraction workflow
    │   └── vector_store.py     # Pinecone upsert / search / delete
    ├── routers/       # FastAPI route handlers
    │   ├── chat.py
    │   ├── categorize.py
    │   ├── extract.py
    │   ├── vectors.py
    │   └── health.py
    ├── api.py         # FastAPI app + middleware
    └── main.py        # Uvicorn entry point
```

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/MinMyatPaing/student-budgeting-project-final-year-.git
cd student-budgeting-project-final-year
```

---

### 2. Backend (Node.js)

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=3000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/studybudget
JWT_SECRET=your_jwt_secret_here
AGENT_API_URL=http://localhost:8000
```

Start:

```bash
npm run dev        # development (nodemon)
# or
npm start          # production
```

---

### 3. Agent (Python FastAPI)

```bash
cd agent
uv sync            # install all dependencies from uv.lock
```

Create `agent/.env`:

```env
# Anthropic — Claude (chat + categorisation)
CLAUDE_API_KEY=sk-ant-api03-...

# OpenAI — embeddings only (text-embedding-3-small)
OPENAI_API_KEY=sk-proj-...

# Pinecone — vector storage
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=student-budgeting-final-year

# Tavily — web search tool (optional but recommended)
TAVILY_API_KEY=tvly-...

# Perplexity — deep search tool (optional)
PERPLEXITY_API_KEY=pplx-...

# LangSmith — tracing (optional)
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_pt_...
LANGSMITH_PROJECT=LangGraph-Agent
```

Start:

```bash
uv run main.py
# Agent runs on http://localhost:8000
```

> **Note on Pinecone index**: create a serverless index in your Pinecone dashboard with **1536 dimensions** and **cosine** metric before running the agent.

---

### 4. Frontend (React Native / Expo)

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

> Replace `localhost` with your machine's LAN IP address (e.g. `192.168.1.x`) when testing on a physical device.

Start:

```bash
npx expo start
```

Scan the QR code with Expo Go or press `i` / `a` for simulator.

---

## Agent API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/extract` | Extract transactions from a PDF (multipart/form-data `file`) |
| `POST` | `/categorize` | Categorise a list of transactions |
| `POST` | `/chat` | Send a message to the AI assistant |
| `POST` | `/vectors/upsert` | Embed & store transactions in Pinecone |
| `POST` | `/vectors/delete` | Delete a transaction vector from Pinecone |

### Chat request example

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend on food this month?", "session_id": "<mongo_user_id>"}'
```

---

## Backend API Endpoints

All routes below (except auth) require a valid JWT cookie.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT cookie |
| `POST` | `/api/auth/logout` | Clear JWT cookie |
| `GET` | `/api/auth/me` | Get current user profile |
| `PUT` | `/api/auth/me` | Update profile |
| `GET` | `/api/transactions` | Get all transactions (sorted newest first) |
| `GET` | `/api/transactions/recent?limit=6` | Get N most recent transactions |
| `POST` | `/api/transactions` | Add a single transaction |
| `POST` | `/api/transactions/bulk` | Bulk-add transactions (after PDF extract) |
| `DELETE` | `/api/transactions/:id` | Delete a transaction |
| `POST` | `/api/chat/message` | Proxy message to AI agent |

---

## How the RAG Pipeline Works

```
User adds / uploads transactions
        ↓
Backend saves to MongoDB
        ↓  (fire-and-forget)
POST /vectors/upsert → Agent
        ↓
OpenAI text-embedding-3-small
        ↓
Pinecone upsert (namespace = user_id)
        ↓  (at chat time)
User asks a question in chat
        ↓
Agent calls search_my_transactions tool
        ↓
Semantic query → Pinecone
        ↓
Top-K relevant transactions returned as context
        ↓
Claude answers using real transaction data
```

---

## Transaction Categories

Transactions are automatically grouped into:

`Transportation` · `Eat Out` · `Groceries` · `Shopping` · `Entertainment` · `Bills & Utilities` · `Healthcare` · `Education` · `Personal Care` · `Other`

---

## Running All Three Services

Open three terminal tabs:

```bash
# Tab 1 — Agent
cd agent && uv run main.py

# Tab 2 — Backend
cd backend && npm run dev

# Tab 3 — Frontend
cd frontend && npx expo start
```

---

## Licence

MIT — see [LICENSE](LICENSE) for details.

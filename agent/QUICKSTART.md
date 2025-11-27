# Quick Start Guide

## 1. Setup Python Environment

```bash
cd agent
uv sync
```

## 2. Configure Environment Variables

Create a `.env` file:
```env
OPENAI_API_KEY=sk-your-key-here
TAVILY_API_KEY=your-tavily-key-here  # Optional
```

## 3. Start the FastAPI Server

```bash
python api.py
```

Or with uvicorn:
```bash
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

## 4. Test the API

### Extract transactions from PDF:
```bash
curl -X POST "http://localhost:8000/extract" \
  -F "file=@assets/sample_bank_statement.pdf"
```

### Categorize transactions:
```bash
curl -X POST "http://localhost:8000/categorize" \
  -H "Content-Type: application/json" \
  -d '{
    "transactions": [
      {
        "date": "2023-03-15",
        "description": "STARBUCKS #1234",
        "amount": -5.50,
        "balance": 1234.56
      }
    ]
  }'
```

## 5. Setup Node.js Backend

```bash
cd ../backend
npm install express multer axios cors dotenv form-data
# Copy server.example.js to server.js
# Update AGENT_API_URL in .env if needed
node server.js
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc


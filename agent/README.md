# PocketWise — Agent API

A FastAPI service that powers the AI features of PocketWise: extracting transactions from bank statement PDFs, categorising them using Claude, managing Pinecone vector storage for RAG, and serving the conversational AI chat assistant.

## Features

- **PDF Transaction Extraction**: Uses NuExtract-2.0-2B model to extract transactions from bank statement PDFs
- **Transaction Categorization**: Uses LangGraph with OpenAI GPT-4 to categorize transactions into groups (Transportation, Eat Out, Groceries, etc.)
- **RESTful API**: FastAPI endpoints for easy integration with Node.js backend

## Setup

1. Install dependencies:
```bash
cd agent
uv sync
```

2. Create a `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here  # Optional
```

3. Run the API server:
```bash
python api.py
# Or with uvicorn directly:
uvicorn api:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Endpoints

### 1. Health Check
- **GET** `/health`
- Returns API health status

### 2. Extract Transactions from PDF
- **POST** `/extract`
- **Request**: Multipart form data with PDF file
- **Response**: JSON with list of extracted transactions

**Example Request (cURL)**:
```bash
curl -X POST "http://localhost:8000/extract" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@statement.pdf"
```

**Example Response**:
```json
{
  "transactions": [
    {
      "date": "2023-03-15",
      "description": "STARBUCKS #1234",
      "amount": -5.50,
      "balance": 1234.56
    }
  ],
  "success": true,
  "message": "Successfully extracted 10 transactions"
}
```

### 3. Categorize Transactions
- **POST** `/categorize`
- **Request**: JSON with list of transactions
- **Response**: JSON with categorized transactions

**Example Request**:
```json
{
  "transactions": [
    {
      "date": "2023-03-15",
      "description": "STARBUCKS #1234",
      "amount": -5.50,
      "balance": 1234.56
    }
  ]
}
```

**Example Response**:
```json
{
  "transactions": [
    {
      "date": "2023-03-15",
      "description": "STARBUCKS #1234",
      "amount": -5.50,
      "balance": 1234.56,
      "category": "Eat Out",
      "merchant": "STARBUCKS"
    }
  ],
  "success": true,
  "message": "Successfully categorized 10 transactions"
}
```

## Transaction Categories

The categorization agent groups transactions into:
- **Transportation**: Uber, Lyft, gas stations, public transit, parking
- **Eat Out**: Restaurants, cafes, fast food, food delivery
- **Groceries**: Supermarkets, grocery stores, food markets
- **Shopping**: Retail stores, online shopping, clothing, electronics
- **Entertainment**: Movies, concerts, streaming services, games
- **Bills & Utilities**: Electricity, water, internet, phone, rent
- **Healthcare**: Pharmacy, doctor, hospital, medical services
- **Education**: Tuition, books, school supplies, courses
- **Personal Care**: Haircuts, gym, spa, beauty services
- **Other**: Anything that doesn't fit the above categories

## Integration with Node.js Backend

### Example Express.js Route

```javascript
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });
const AGENT_API_URL = 'http://localhost:8000';

// Extract transactions from PDF
router.post('/extract', upload.single('pdf'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path));
    
    const response = await axios.post(
      `${AGENT_API_URL}/extract`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Categorize transactions
router.post('/categorize', async (req, res) => {
  try {
    const response = await axios.post(
      `${AGENT_API_URL}/categorize`,
      { transactions: req.body.transactions }
    );
    
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Architecture

```
Frontend (React Native)
    ↓
Backend (Node.js/Express)
    ↓
FastAPI Agent Service
    ├── /extract → main.py (NuExtract)
    └── /categorize → categorize_agent.py (LangGraph + OpenAI)
```

## Dependencies

- **FastAPI**: Web framework
- **LangGraph**: Agent orchestration
- **OpenAI**: Transaction categorization
- **Tavily**: Optional merchant lookup enhancement
- **NuExtract**: PDF transaction extraction
- **PyMuPDF**: PDF processing

## Notes

- The NuExtract model is loaded on first use (may take time on first request)
- PDF files are temporarily stored during processing
- Categorization uses GPT-4o-mini for cost efficiency
- Tavily search is optional but can improve merchant identification


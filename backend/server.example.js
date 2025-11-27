/**
 * Example Express.js server for integrating with the FastAPI agent service
 * 
 * To use this:
 * 1. Install dependencies: npm install express multer axios cors dotenv
 * 2. Copy this file to server.js
 * 3. Update AGENT_API_URL if needed
 * 4. Run: node server.js
 */

const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000';

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * POST /api/extract
 * Receives PDF from frontend, forwards to agent, returns transactions
 */
app.post('/api/extract', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file provided' });
  }

  try {
    // Create form data for agent API
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', await fs.readFile(req.file.path), {
      filename: req.file.originalname || 'statement.pdf',
      contentType: 'application/pdf'
    });

    // Forward to agent API
    const response = await axios.post(
      `${AGENT_API_URL}/extract`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    // Return transactions to frontend
    res.json(response.data);
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    console.error('Error extracting transactions:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to extract transactions'
    });
  }
});

/**
 * POST /api/categorize
 * Receives transactions from frontend, forwards to agent for categorization
 */
app.post('/api/categorize', async (req, res) => {
  if (!req.body.transactions || !Array.isArray(req.body.transactions)) {
    return res.status(400).json({ error: 'Transactions array is required' });
  }

  try {
    // Forward to agent API
    const response = await axios.post(
      `${AGENT_API_URL}/categorize`,
      { transactions: req.body.transactions }
    );

    // Return categorized transactions to frontend
    res.json(response.data);
  } catch (error) {
    console.error('Error categorizing transactions:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to categorize transactions'
    });
  }
});

/**
 * POST /api/extract-and-categorize
 * Combined endpoint: extract from PDF and categorize in one call
 */
app.post('/api/extract-and-categorize', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file provided' });
  }

  try {
    // Step 1: Extract transactions
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('file', await fs.readFile(req.file.path), {
      filename: req.file.originalname || 'statement.pdf',
      contentType: 'application/pdf'
    });

    const extractResponse = await axios.post(
      `${AGENT_API_URL}/extract`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    if (!extractResponse.data.success || !extractResponse.data.transactions.length) {
      return res.json({
        transactions: [],
        success: false,
        message: 'No transactions extracted'
      });
    }

    // Step 2: Categorize transactions
    const categorizeResponse = await axios.post(
      `${AGENT_API_URL}/categorize`,
      { transactions: extractResponse.data.transactions }
    );

    // Return categorized transactions to frontend
    res.json(categorizeResponse.data);
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    console.error('Error in extract-and-categorize:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.detail || error.message || 'Failed to process PDF'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Agent API URL: ${AGENT_API_URL}`);
});


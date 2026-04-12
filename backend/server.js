const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000';
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
	.catch((err) => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// // Configure multer for file uploads
// const upload = multer({ 
// 	dest: 'uploads/',
// 	limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
// });

// Mount auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Mount chat routes (protected by JWT via authCheck inside the router)
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

// Mount transaction routes (all protected by authCheck inside the router)
const transactionRoutes = require('./routes/transactions');
app.use('/api/transactions', transactionRoutes);

// /**
//  * POST /api/extract
//  * Receives PDF from frontend, forwards to agent, returns transactions
//  */
// app.post('/api/extract', upload.single('pdf'), async (req, res) => {
// 	if (!req.file) {
// 		return res.status(400).json({ error: 'No PDF file provided' });
// 	}

// 	try {
// 		// Create form data for agent API
// 		const FormData = require('form-data');
// 		const formData = new FormData();
// 		formData.append('file', await fs.readFile(req.file.path), {
// 			filename: req.file.originalname || 'statement.pdf',
// 			contentType: 'application/pdf'
// 		});

// 		// Forward to agent API
// 		const response = await axios.post(
// 			`${AGENT_API_URL}/extract`,
// 			formData,
// 			{
// 				headers: {
// 					...formData.getHeaders(),
// 				},
// 			}
// 		);

// 		// Clean up uploaded file
// 		await fs.unlink(req.file.path);

// 		// Return transactions to frontend
// 		res.json(response.data);
// 	} catch (error) {
// 		// Clean up uploaded file on error
// 		if (req.file) {
// 			await fs.unlink(req.file.path).catch(() => {});
// 		}

// 		console.error('Error extracting transactions:', error.message);
// 		res.status(error.response?.status || 500).json({
// 			error: error.response?.data?.detail || error.message || 'Failed to extract transactions'
// 		});
// 	}
// });

// /**
//  * POST /api/categorize
//  * Receives transactions from frontend, forwards to agent for categorization
//  */
// app.post('/api/categorize', async (req, res) => {
// 	if (!req.body.transactions || !Array.isArray(req.body.transactions)) {
// 		return res.status(400).json({ error: 'Transactions array is required' });
// 	}

// 	try {
// 		// Forward to agent API
// 		const response = await axios.post(
// 			`${AGENT_API_URL}/categorize`,
// 			{ transactions: req.body.transactions }
// 		);

// 		// Return categorized transactions to frontend
// 		res.json(response.data);
// 	} catch (error) {
// 		console.error('Error categorizing transactions:', error.message);
// 		res.status(error.response?.status || 500).json({
// 			error: error.response?.data?.detail || error.message || 'Failed to categorize transactions'
// 		});
// 	}
// });

// /**
//  * POST /api/extract-and-categorize
//  * Combined endpoint: extract from PDF and categorize in one call
//  */
// app.post('/api/extract-and-categorize', upload.single('pdf'), async (req, res) => {
// 	if (!req.file) {
// 		return res.status(400).json({ error: 'No PDF file provided' });
// 	}

// 	try {
// 		// Step 1: Extract transactions
// 		const FormData = require('form-data');
// 		const formData = new FormData();
// 		formData.append('file', await fs.readFile(req.file.path), {
// 			filename: req.file.originalname || 'statement.pdf',
// 			contentType: 'application/pdf'
// 		});

// 		const extractResponse = await axios.post(
// 			`${AGENT_API_URL}/extract`,
// 			formData,
// 			{
// 				headers: {
// 					...formData.getHeaders(),
// 				},
// 			}
// 		);

// 		// Clean up uploaded file
// 		await fs.unlink(req.file.path);

// 		if (!extractResponse.data.success || !extractResponse.data.transactions.length) {
// 			return res.json({
// 				transactions: [],
// 				success: false,
// 				message: 'No transactions extracted'
// 			});
// 		}

// 		// Step 2: Categorize transactions
// 		const categorizeResponse = await axios.post(
// 			`${AGENT_API_URL}/categorize`,
// 			{ transactions: extractResponse.data.transactions }
// 		);

// 		// Return categorized transactions to frontend
// 		res.json(categorizeResponse.data);
// 	} catch (error) {
// 		// Clean up uploaded file on error
// 		if (req.file) {
// 			await fs.unlink(req.file.path).catch(() => {});
// 		}

// 		console.error('Error in extract-and-categorize:', error.message);
// 		res.status(error.response?.status || 500).json({
// 			error: error.response?.data?.detail || error.message || 'Failed to process PDF'
// 		});
// 	}
// });

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
	console.log(`Backend server running on http://localhost:${PORT}`);
	console.log(`Agent API URL: ${AGENT_API_URL}`);
});

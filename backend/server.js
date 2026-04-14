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

// Configure multer for PDF uploads (10 MB limit, memory storage — no disk write)
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
	fileFilter: (_req, file, cb) => {
		if (file.mimetype === 'application/pdf') {
			cb(null, true);
		} else {
			cb(new Error('Only PDF files are accepted'));
		}
	},
});

// Mount auth routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Mount chat routes (protected by JWT via authCheck inside the router)
const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

// Mount transaction routes (all protected by authCheck inside the router)
const transactionRoutes = require('./routes/transactions');
app.use('/api/transactions', transactionRoutes);

// ─── Auth middleware (inline, for the extract routes below) ──────────────────
const authCheck = require('./middleware/auth');

/**
 * POST /api/extract
 *
 * Step 1 of the two-step upload flow.
 * Receives a PDF from the frontend, forwards it to the Python agent for
 * Claude Vision extraction + categorisation, and returns the transaction
 * preview to the frontend.  Nothing is written to the database yet.
 *
 * The agent enforces:
 *   - PDF-only guard (file type)
 *   - Bank statement guard (keyword heuristic)
 *   - Privacy: the raw PDF is deleted from the agent's temp dir immediately
 */
app.post('/api/extract', authCheck, upload.single('pdf'), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ error: 'No PDF file provided' });
	}

	try {
		const FormData = require('form-data');
		const formData = new FormData();

		// Forward the in-memory buffer directly — no disk write on the backend
		formData.append('file', req.file.buffer, {
			filename: req.file.originalname || 'statement.pdf',
			contentType: 'application/pdf',
		});

		const response = await axios.post(
			`${AGENT_API_URL}/extract`,
			formData,
			{
				headers: { ...formData.getHeaders() },
				// Bank statements can be large; allow up to 5 minutes
				timeout: 300_000,
			}
		);

		// Forward the agent's ExtractPreviewResponse (includes disclaimer)
		res.json(response.data);
	} catch (error) {
		console.error('Error extracting transactions:', error.message);
		res.status(error.response?.status || 500).json({
			error: error.response?.data?.detail || error.message || 'Failed to extract transactions',
		});
	}
});

/**
 * POST /api/extract/confirm
 *
 * Step 2 of the two-step upload flow.
 * The frontend sends the reviewed (and optionally edited) transaction list
 * after the user clicks "Confirm & Save".
 * This endpoint bulk-inserts into MongoDB and syncs to Pinecone via the
 * existing /api/transactions/bulk route logic.
 *
 * Body: { transactions: [...] }
 */
app.post('/api/extract/confirm', authCheck, async (req, res) => {
	const { transactions } = req.body;

	if (!Array.isArray(transactions) || transactions.length === 0) {
		return res.status(400).json({ error: 'transactions array is required' });
	}

	try {
		// Reuse the existing bulk-add controller logic by calling it internally
		const Transaction = require('./models/Transaction');
		const agentUrl = AGENT_API_URL;

		const docs = transactions.map((t) => ({
			userId: req.user.id,
			date: new Date(t.date),
			description: t.description,
			amount: parseFloat(t.amount),
			balance: t.balance !== undefined && t.balance !== null ? parseFloat(t.balance) : null,
			category: t.category || 'Other',
			merchant: t.merchant || null,
		}));

		const inserted = await Transaction.insertMany(docs, { ordered: false });

		// Fire-and-forget Pinecone sync
		const payload = inserted.map((d) => ({
			...d.toObject(),
			_id: d._id.toString(),
			userId: d.userId.toString(),
			date: d.date instanceof Date ? d.date.toISOString() : d.date,
		}));

		axios
			.post(`${agentUrl}/vectors/upsert`, {
				transactions: payload,
				user_id: req.user.id.toString(),
			})
			.catch((err) => console.warn('[vector-sync] upsert failed:', err.message));

		res.status(201).json({
			success: true,
			count: inserted.length,
			transactions: inserted,
		});
	} catch (error) {
		console.error('Error confirming transactions:', error);
		res.status(500).json({ error: 'Failed to save transactions' });
	}
});

/**
 * POST /api/report
 *
 * Generates a personalised financial report for the authenticated user.
 * Calls the Python agent which uses Claude to produce a structured analysis,
 * then returns the report as a JSON object that the frontend renders and
 * can export as a PDF via expo-print.
 *
 * Body: { month: "YYYY-MM", transactions: [...] }
 */
app.post('/api/report', authCheck, async (req, res) => {
	const { month, transactions } = req.body;
	if (!Array.isArray(transactions)) {
		return res.status(400).json({ error: 'transactions array is required' });
	}
	try {
		const response = await axios.post(
			`${AGENT_API_URL}/report`,
			{ month, transactions, user: req.user },
			{ timeout: 120_000 }
		);
		res.json(response.data);
	} catch (error) {
		console.error('Report generation error:', error.message);
		res.status(error.response?.status || 500).json({
			error: error.response?.data?.detail || error.message || 'Failed to generate report',
		});
	}
});

// ─── Legacy commented-out endpoints (kept for reference) ─────────────────────

// /**
//  * POST /api/categorize
//  * Receives transactions from frontend, forwards to agent for categorization
//  */
// app.post('/api/categorize', async (req, res) => { ... });

// /**
//  * POST /api/extract-and-categorize
//  * Combined endpoint: extract from PDF and categorize in one call
//  * (Now replaced by the two-step /api/extract + /api/extract/confirm flow)
//  */
// app.post('/api/extract-and-categorize', upload.single('pdf'), async (req, res) => { ... });

// Health check
app.get('/health', (req, res) => {
	res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
	console.log(`Backend server running on http://localhost:${PORT}`);
	console.log(`Agent API URL: ${AGENT_API_URL}`);
});

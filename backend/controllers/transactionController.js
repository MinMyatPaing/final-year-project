const axios = require('axios');
const Transaction = require('../models/Transaction');

const AGENT_URL = process.env.AGENT_API_URL || 'http://localhost:8000';

// ─── Vector sync helpers (fire-and-forget) ───────────────────────────────────

/**
 * Upsert one or more transactions to Pinecone.
 * Non-blocking — never delays the HTTP response.
 */
function syncUpsert(transactions, userId) {
  const docs = Array.isArray(transactions) ? transactions : [transactions];
  // Normalise MongoDB documents: ensure _id is a plain string
  const payload = docs.map((t) => ({
    ...t,
    _id: t._id ? t._id.toString() : undefined,
    userId: t.userId ? t.userId.toString() : userId.toString(),
    date: t.date instanceof Date ? t.date.toISOString() : t.date,
  }));

  axios
    .post(`${AGENT_URL}/vectors/upsert`, {
      transactions: payload,
      user_id: userId.toString(),
    })
    .catch((err) =>
      console.warn('[vector-sync] upsert failed:', err.message)
    );
}

/**
 * Delete a transaction vector from Pinecone.
 * Non-blocking — never delays the HTTP response.
 */
function syncDelete(transactionId, userId) {
  axios
    .post(`${AGENT_URL}/vectors/delete`, {
      transaction_id: transactionId.toString(),
      user_id: userId.toString(),
    })
    .catch((err) =>
      console.warn('[vector-sync] delete failed:', err.message)
    );
}

// ─── Route handlers ──────────────────────────────────────────────────────────

/**
 * GET /api/transactions
 * Returns ALL transactions for the authenticated user, sorted newest first.
 */
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('getTransactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

/**
 * GET /api/transactions/recent?limit=6
 * Returns the most recent N transactions (default 6) for the authenticated user.
 */
exports.getRecentTransactions = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    const transactions = await Transaction.find({ userId: req.user.id })
      .sort({ date: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('getRecentTransactions error:', error);
    res.status(500).json({ error: 'Failed to fetch recent transactions' });
  }
};

/**
 * POST /api/transactions
 * Add a single transaction for the authenticated user.
 */
exports.addTransaction = async (req, res) => {
  try {
    const { date, description, amount, balance, category, merchant } = req.body;

    if (!date || !description || amount === undefined) {
      return res.status(400).json({ error: 'date, description and amount are required' });
    }

    const transaction = new Transaction({
      userId: req.user.id,
      date: new Date(date),
      description,
      amount: parseFloat(amount),
      balance: balance !== undefined ? parseFloat(balance) : null,
      category: category || 'Other',
      merchant: merchant || null,
    });

    await transaction.save();

    // Sync to Pinecone (non-blocking)
    syncUpsert(transaction.toObject(), req.user.id);

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    console.error('addTransaction error:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
};

/**
 * POST /api/transactions/bulk
 * Add multiple transactions at once (used after PDF extraction).
 */
exports.bulkAddTransactions = async (req, res) => {
  try {
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'transactions array is required' });
    }

    const docs = transactions.map((t) => ({
      userId: req.user.id,
      date: new Date(t.date),
      description: t.description,
      amount: parseFloat(t.amount),
      balance: t.balance !== undefined ? parseFloat(t.balance) : null,
      category: t.category || 'Other',
      merchant: t.merchant || null,
    }));

    const inserted = await Transaction.insertMany(docs, { ordered: false });

    // Sync to Pinecone (non-blocking)
    syncUpsert(inserted.map((d) => d.toObject()), req.user.id);

    res.status(201).json({ success: true, count: inserted.length, transactions: inserted });
  } catch (error) {
    console.error('bulkAddTransactions error:', error);
    res.status(500).json({ error: 'Failed to bulk-add transactions' });
  }
};

/**
 * DELETE /api/transactions/:id
 * Delete a single transaction (must belong to the authenticated user).
 */
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Sync deletion to Pinecone (non-blocking)
    syncDelete(req.params.id, req.user.id);

    res.json({ success: true });
  } catch (error) {
    console.error('deleteTransaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

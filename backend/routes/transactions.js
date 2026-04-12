const express = require('express');
const router = express.Router();
const authCheck = require('../middleware/auth');
const {
  getTransactions,
  getRecentTransactions,
  addTransaction,
  bulkAddTransactions,
  deleteTransaction,
} = require('../controllers/transactionController');

// All routes require a valid JWT
router.use(authCheck);

// GET /api/transactions         — all transactions for the authenticated user
router.get('/', getTransactions);

// GET /api/transactions/recent?limit=6  — most recent N transactions
router.get('/recent', getRecentTransactions);

// POST /api/transactions        — add a single transaction
router.post('/', addTransaction);

// POST /api/transactions/bulk   — add many transactions at once
router.post('/bulk', bulkAddTransactions);

// DELETE /api/transactions/:id  — delete a transaction
router.delete('/:id', deleteTransaction);

module.exports = router;

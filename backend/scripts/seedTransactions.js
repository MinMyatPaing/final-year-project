/**
 * Seed script — loads transactions from agent/transactions.json
 * and inserts them into MongoDB for a specific userId.
 *
 * Usage:
 *   cd backend
 *   node scripts/seedTransactions.js
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const Transaction = require('../models/Transaction');

// ─── Target user ──────────────────────────────────────────────────────────────
const TARGET_USER_ID = '69a03412163889e9fdd088fa';

// ─── Raw JSON from agent/transactions.json ───────────────────────────────────
const rawTransactions = [
  { date: '2025-08-21', description: 'CASH IN HSBC AUG21', amount: 750.0, balance: 927.57 },
  { date: '2025-08-21', description: 'CASH IN HSBC AUG21', amount: 1940.0, balance: 2867.57 },
  { date: '2025-08-22', description: 'Min Paing Transfer', amount: -48.0, balance: 2819.57 },
  { date: '2025-08-23', description: 'Monthly Housing Fee', amount: -500.0, balance: 2319.57 },
  { date: '2025-08-24', description: 'Min Paing Transfer', amount: -300.0, balance: 2019.57 },
  { date: '2025-08-26', description: 'New TongYi Supermarket', amount: -5.79, balance: 2013.78 },
  { date: '2025-08-26', description: 'NYA*Oaka Vending University', amount: -1.4, balance: 2012.38 },
  { date: '2025-08-26', description: 'TESCO STORES 2686', amount: -24.23, balance: 1988.15 },
  { date: '2025-08-26', description: 'RANAIN LTD T/A BUNS', amount: -9.99, balance: 1978.16 },
  { date: '2025-08-26', description: 'LIDL GB HUDDERSFIELD', amount: -3.59, balance: 1974.57 },
  { date: '2025-08-26', description: 'New TongYi Supermarket', amount: -5.79, balance: 1968.78 },
  { date: '2025-08-26', description: 'HUDDERSFIELD DISCO', amount: -3.9, balance: 1964.88 },
  { date: '2025-08-26', description: 'A TO Z DISCOUNT STORE', amount: -4.49, balance: 1960.39 },
  { date: '2025-08-26', description: 'HUDDERSFIELD BUS', amount: -1.7, balance: 1958.69 },
  { date: '2025-08-26', description: 'UBR* PENDING.UBER.COM', amount: -13.55, balance: 1945.14 },
  { date: '2025-08-26', description: 'TESCO STORES 2686', amount: -9.12, balance: 1936.02 },
  { date: '2025-08-26', description: 'TRAINLINE', amount: -80.89, balance: 1855.13 },
  { date: '2025-08-26', description: 'PAYPAL *ALIPAY UK', amount: -9.6, balance: 1845.53 },
];

// ─── Category heuristics ─────────────────────────────────────────────────────
function guessCategory(description, amount) {
  const d = description.toUpperCase();
  if (amount > 0) return 'Other'; // income
  if (/TESCO|LIDL|SUPERMA|ALDI|SAINSBURY|WAITROSE|ASDA|CO-OP|MORRISONS|BUNS|VENDING/.test(d))
    return 'Food';
  if (/UBER|TRAINLINE|BUS|METRO|TAXI|RAIL|TRANSPORT/.test(d)) return 'Transport';
  if (/DISCO|CINEMA|SPOTIFY|NETFLIX|AMAZON PRIME|ENTERTAINMENT/.test(d))
    return 'Entertainment';
  if (/DISCOUNT|AMAZON|ARGOS|H&M|ZARA|SHOP|STORE|PAYPAL|ALIPAY/.test(d))
    return 'Shopping';
  if (/HOUSING|RENT|FEE|ACCOMMODATION/.test(d)) return 'Housing';
  if (/PHARMACY|BOOTS|HEALTH|DENTAL|DOCTOR/.test(d)) return 'Health';
  if (/UNIVERSITY|UNI|TUITION|BOOK|EDUCATION|LIBRARY/.test(d)) return 'Education';
  return 'Other';
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Remove existing transactions for this user to avoid duplicates
  const deleted = await Transaction.deleteMany({ userId: TARGET_USER_ID });
  console.log(`🗑️  Removed ${deleted.deletedCount} existing transactions for user`);

  const docs = rawTransactions.map((t) => ({
    userId: new mongoose.Types.ObjectId(TARGET_USER_ID),
    date: new Date(t.date),
    description: t.description,
    amount: t.amount,
    balance: t.balance ?? null,
    category: guessCategory(t.description, t.amount),
    merchant: null,
  }));

  const inserted = await Transaction.insertMany(docs);
  console.log(`✅ Inserted ${inserted.length} transactions for userId: ${TARGET_USER_ID}`);

  // Summary
  const totalSpent = docs
    .filter((d) => d.amount < 0)
    .reduce((s, d) => s + Math.abs(d.amount), 0);
  const totalIncome = docs
    .filter((d) => d.amount > 0)
    .reduce((s, d) => s + d.amount, 0);
  console.log(`💰 Total Income:  £${totalIncome.toFixed(2)}`);
  console.log(`💸 Total Spent:   £${totalSpent.toFixed(2)}`);

  await mongoose.disconnect();
  console.log('✅ Done');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

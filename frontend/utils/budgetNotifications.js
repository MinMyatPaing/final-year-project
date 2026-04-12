/**
 * Budget notification utilities.
 *
 * Triggers local push notifications when:
 *   • Any category reaches 80% of its monthly limit
 *   • Any category EXCEEDS its monthly limit
 *   • Total monthly spending reaches 80% of the overall budget
 *   • Total monthly spending EXCEEDS the overall budget
 *
 * Each alert fires at most once per calendar month (tracked in AsyncStorage)
 * so users are not spammed every time the app opens.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants (mirror budget.js) ────────────────────────────────────────────

const BUDGET_LIMITS_KEY   = 'studybudget_limits';
const NOTIF_SENT_KEY      = 'studybudget_notifs_sent';

const DEFAULT_LIMITS = {
  'Food & Dining':   150,
  Transport:          60,
  Entertainment:      40,
  Shopping:           80,
  Education:          50,
  'Housing & Bills': 500,
  Healthcare:         30,
  'Personal Care':    30,
};

const CATEGORY_ALIASES = [
  { label: 'Food & Dining',   aliases: ['food', 'groceries', 'eat out', 'eating out'] },
  { label: 'Transport',       aliases: ['transport', 'transportation'] },
  { label: 'Entertainment',   aliases: ['entertainment'] },
  { label: 'Shopping',        aliases: ['shopping'] },
  { label: 'Education',       aliases: ['education'] },
  { label: 'Housing & Bills', aliases: ['housing', 'bills & utilities', 'bills', 'utilities'] },
  { label: 'Healthcare',      aliases: ['health', 'healthcare'] },
  { label: 'Personal Care',   aliases: ['personal care'] },
];

function matchCategory(txnCategory) {
  const lower = (txnCategory || '').toLowerCase().trim();
  for (const { label, aliases } of CATEGORY_ALIASES) {
    if (aliases.some((a) => lower === a || lower.includes(a) || a.includes(lower))) {
      return label;
    }
  }
  return null;
}

// ─── Permission helper ────────────────────────────────────────────────────────

export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: asked } = await Notifications.requestPermissionsAsync();
  return asked === 'granted';
}

// ─── Main alert checker ───────────────────────────────────────────────────────

/**
 * Given the current list of transactions (from Redux), load budget limits and
 * fire any relevant local notifications that have not yet been sent this month.
 *
 * @param {Array} transactions  Full transaction array from Redux store.
 */
export async function checkBudgetAlerts(transactions) {
  if (!transactions?.length) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  // ── Load limits ──────────────────────────────────────────────────────────
  const limitsRaw = await AsyncStorage.getItem(BUDGET_LIMITS_KEY);
  const limits    = limitsRaw ? JSON.parse(limitsRaw) : DEFAULT_LIMITS;

  // ── Monthly "already sent" set ───────────────────────────────────────────
  const now      = new Date();
  const monthKey = `${NOTIF_SENT_KEY}_${now.getFullYear()}-${now.getMonth()}`;
  const sentRaw  = await AsyncStorage.getItem(monthKey);
  const sent     = new Set(sentRaw ? JSON.parse(sentRaw) : []);

  // ── Calculate this-month expenses per category ───────────────────────────
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const spending   = {};
  let   totalSpent = 0;

  transactions.forEach((t) => {
    const amt = parseFloat(t.amount);
    if (isNaN(amt) || amt >= 0) return;          // skip income
    if (new Date(t.date) < monthStart) return;   // skip other months

    const cat = matchCategory(t.category);
    if (cat) spending[cat] = (spending[cat] || 0) + Math.abs(amt);
    totalSpent += Math.abs(amt);
  });

  const totalBudget = Object.values(limits).reduce((a, b) => a + b, 0);
  const pending     = [];   // { id, title, body }

  // ── Total budget checks ──────────────────────────────────────────────────
  if (totalBudget > 0) {
    const pct = (totalSpent / totalBudget) * 100;
    if (pct >= 100 && !sent.has('total_over')) {
      pending.push({
        id:    'total_over',
        title: '🚨 Monthly Budget Exceeded',
        body:  `You've spent £${totalSpent.toFixed(0)} against a £${totalBudget.toFixed(0)} monthly budget.`,
      });
    } else if (pct >= 80 && !sent.has('total_80')) {
      pending.push({
        id:    'total_80',
        title: '⚠️ Budget Warning',
        body:  `You've used ${pct.toFixed(0)}% of your £${totalBudget.toFixed(0)} monthly budget — tread carefully!`,
      });
    }
  }

  // ── Per-category checks ──────────────────────────────────────────────────
  for (const [cat, spent] of Object.entries(spending)) {
    const limit = limits[cat] || 0;
    if (!limit) continue;
    const pct = (spent / limit) * 100;

    if (pct >= 100 && !sent.has(`${cat}_over`)) {
      pending.push({
        id:    `${cat}_over`,
        title: `🚨 ${cat} Budget Exceeded`,
        body:  `You've spent £${spent.toFixed(0)} on ${cat} this month (limit: £${limit}).`,
      });
    } else if (pct >= 80 && !sent.has(`${cat}_80`)) {
      pending.push({
        id:    `${cat}_80`,
        title: `🔔 ${cat} Alert`,
        body:  `You've used ${pct.toFixed(0)}% of your £${limit} ${cat} budget this month.`,
      });
    }
  }

  // ── Send and record ──────────────────────────────────────────────────────
  if (pending.length === 0) return;

  for (const n of pending) {
    await Notifications.scheduleNotificationAsync({
      content: { title: n.title, body: n.body, sound: true },
      trigger: null,  // fire immediately
    });
    sent.add(n.id);
  }

  await AsyncStorage.setItem(monthKey, JSON.stringify([...sent]));
}

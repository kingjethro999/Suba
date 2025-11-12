import express from 'express';
import { dbPromise } from '../models/db.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Debug all analytics requests
router.use((req, res, next) => {
  console.log(`📊 Analytics request: ${req.method} ${req.originalUrl}`);
  next();
});

// Helpers
const toMySQLDateTime = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

const clampPeriod = (p) => {
  const v = (p || 'monthly').toLowerCase();
  return v === 'weekly' || v === 'yearly' ? v : 'monthly';
};

// ISO week helpers
const getISOWeekYear = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
};

const startOfISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// Calendar boundaries for totals endpoints
const totalsWindowStart = (period) => {
  const now = new Date();
  if (period === 'weekly') return startOfISOWeek(now);                 // start of ISO week
  if (period === 'yearly') return new Date(now.getFullYear(), 0, 1);   // Jan 1st
  return new Date(now.getFullYear(), now.getMonth(), 1);               // 1st of month
};

const lastNWeeksBuckets = (n) => {
  const buckets = [];
  const now = new Date();
  const currentMonday = startOfISOWeek(now);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(currentMonday);
    dt.setUTCDate(currentMonday.getUTCDate() - i * 7);
    const { year, week } = getISOWeekYear(dt);
    const key = year * 100 + week; // e.g., 202445
    buckets.push({ key, label: `W${String(week).padStart(2, '0')}`, start: dt });
  }
  return buckets;
};

const lastNMonthsBuckets = (n) => {
  const out = [];
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const label = dt.toLocaleDateString('en-US', { month: 'short' });
    out.push({ key, label, start: dt });
  }
  return out;
};

const lastNYearsBuckets = (n) => {
  const y = new Date().getFullYear();
  return Array.from({ length: n }, (_, i) => {
    const year = y - (n - 1 - i);
    const start = new Date(year, 0, 1);
    return { key: String(year), label: String(year), start };
  });
};

// Server-side normalization (same idea as client getPeriodAmount)
const normalizePeriodAmount = (amount, billing_cycle, period) => {
  const amt = Number(amount) || 0;
  const cycle = (billing_cycle || 'monthly').toLowerCase();
  if (period === 'weekly') {
    if (cycle === 'weekly') return amt;
    if (cycle === 'monthly') return amt / 4.33;
    if (cycle === 'yearly') return amt / 52;
    if (cycle === 'daily') return amt * 7;
    return amt / 4.33;
  }
  if (period === 'yearly') {
    if (cycle === 'weekly') return amt * 52;
    if (cycle === 'monthly') return amt * 12;
    if (cycle === 'yearly') return amt;
    if (cycle === 'daily') return amt * 365;
    return amt * 12;
  }
  // monthly
  if (cycle === 'weekly') return amt * 4.33;
  if (cycle === 'monthly') return amt;
  if (cycle === 'yearly') return amt / 12;
  if (cycle === 'daily') return amt * 30;
  return amt;
};

// Spending analytics (period-aware)
router.get('/spending', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const period = clampPeriod(req.query.period);
    const mode = (req.query.mode || 'actual').toLowerCase();

    // Fetch user default currency
    let defaultCurrency = 'NGN';
    try {
      const [userRows] = await dbPromise.execute(
        'SELECT default_currency FROM users WHERE id = ?',
        [userId]
      );
      defaultCurrency = (userRows?.[0]?.default_currency || 'NGN').toUpperCase();
    } catch {}

    const currency = (req.query.currency || defaultCurrency).toUpperCase();

    if (mode === 'expected') {
      // Sum normalized active subscriptions in the requested currency
      const [subs] = await dbPromise.execute(
        `SELECT amount, billing_cycle, currency
         FROM subscriptions
         WHERE user_id = ?
           AND status = 'active'
           AND (currency IS NULL OR UPPER(currency) = ?)`,
        [userId, currency]
      );

      const total = subs.reduce(
        (sum, s) => sum + normalizePeriodAmount(s.amount, s.billing_cycle, period),
        0
      );

      console.log(`[spending][expected] user=${userId} period=${period} currency=${currency} subs=${subs.length} total=${total}`);

      return res.json({
        totalSpent: Math.round(total),
        totalSubscriptions: subs.length,
        currency,
        period,
        mode: 'expected',
      });
    }

    // Actuals: sum payments in the time window (filtered by currency)
    const from = totalsWindowStart(period);
    const fromStr = toMySQLDateTime(from);

    const [sumRows] = await dbPromise.execute(
      `SELECT COALESCE(SUM(amount), 0) AS total_spent
       FROM payments
       WHERE user_id = ?
         AND status = 'successful'
         AND paid_at >= ?
         AND (currency IS NULL OR UPPER(currency) = ?)`,
      [userId, fromStr, currency]
    );

    const [subCount] = await dbPromise.execute(
      `SELECT COUNT(*) AS cnt
       FROM subscriptions
       WHERE user_id = ?
         AND status = 'active'
         AND (currency IS NULL OR UPPER(currency) = ?)`,
      [userId, currency]
    );

    const total = Number(sumRows?.[0]?.total_spent || 0);
    console.log(`[spending][actual] user=${userId} period=${period} from=${fromStr} currency=${currency} total=${total}`);

    res.json({
      totalSpent: total,
      totalSubscriptions: Number(subCount?.[0]?.cnt || 0),
      currency,
      period,
      mode: 'actual',
    });
  } catch (error) {
    console.error('Analytics spending error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Category breakdown (period-aware, actuals)
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const period = clampPeriod(req.query.period);

    // User currency (for filtering)
    let defaultCurrency = 'NGN';
    try {
      const [userRows] = await dbPromise.execute(
        'SELECT default_currency FROM users WHERE id = ?',
        [userId]
      );
      defaultCurrency = (userRows?.[0]?.default_currency || 'NGN').toUpperCase();
    } catch {}
    const currency = (req.query.currency || defaultCurrency).toUpperCase();

    const from = totalsWindowStart(period);
    const fromStr = toMySQLDateTime(from);

    const [rows] = await dbPromise.execute(
      `SELECT 
         COALESCE(s.category, 'Uncategorized') AS category,
         COALESCE(SUM(p.amount), 0) AS total_amount,
         COUNT(DISTINCT s.id) AS subscription_count
       FROM payments p
       LEFT JOIN subscriptions s ON s.id = p.subscription_id
       WHERE p.user_id = ? 
         AND p.status = 'successful'
         AND p.paid_at >= ?
         AND (p.currency IS NULL OR UPPER(p.currency) = ?)
       GROUP BY COALESCE(s.category, 'Uncategorized')
       ORDER BY total_amount DESC`,
      [userId, fromStr, currency]
    );

    res.json(rows || []);
  } catch (error) {
    console.error('Category analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch category data' });
  }
});

// Trends (period-aware buckets with fill, actuals)
router.get('/trends', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const period = clampPeriod(req.query.period);

    // User currency (for filtering)
    let defaultCurrency = 'NGN';
    try {
      const [userRows] = await dbPromise.execute(
        'SELECT default_currency FROM users WHERE id = ?',
        [userId]
      );
      defaultCurrency = (userRows?.[0]?.default_currency || 'NGN').toUpperCase();
    } catch {}
    const currency = (req.query.currency || defaultCurrency).toUpperCase();

    if (period === 'weekly') {
      // last 8 ISO weeks
      const buckets = lastNWeeksBuckets(8);
      const dateFrom = buckets[0].start;
      const fromStr = toMySQLDateTime(dateFrom);

      const query = `
        SELECT YEARWEEK(paid_at, 1) AS bucket_key,
               COALESCE(SUM(amount), 0) AS total_amount
        FROM payments
        WHERE user_id = ? 
          AND status = 'successful'
          AND paid_at >= ?
          AND (currency IS NULL OR UPPER(currency) = ?)
        GROUP BY YEARWEEK(paid_at, 1)
      `;
      const [rows] = await dbPromise.execute(query, [userId, fromStr, currency]);
      const map = new Map(rows.map(r => [String(r.bucket_key), Number(r.total_amount || 0)]));

      const series = buckets.map(b => ({
        week: String(b.key),
        label: b.label,
        total_amount: map.get(String(b.key)) || 0
      }));

      return res.json(series);
    }

    if (period === 'yearly') {
      // last 5 years
      const buckets = lastNYearsBuckets(5);
      const dateFrom = buckets[0].start;
      const fromStr = toMySQLDateTime(dateFrom);

      const query = `
        SELECT YEAR(paid_at) AS bucket_key,
               COALESCE(SUM(amount), 0) AS total_amount
        FROM payments
        WHERE user_id = ? 
          AND status = 'successful'
          AND paid_at >= ?
          AND (currency IS NULL OR UPPER(currency) = ?)
        GROUP BY YEAR(paid_at)
      `;
      const [rows] = await dbPromise.execute(query, [userId, fromStr, currency]);
      const map = new Map(rows.map(r => [String(r.bucket_key), Number(r.total_amount || 0)]));

      const series = buckets.map(b => ({
        year: b.key,
        label: b.label,
        total_amount: map.get(b.key) || 0
      }));

      return res.json(series);
    }

    // monthly (default): last 6 months
    const buckets = lastNMonthsBuckets(6);
    const dateFrom = buckets[0].start;
    const fromStr = toMySQLDateTime(dateFrom);

    const query = `
      SELECT DATE_FORMAT(paid_at, '%Y-%m') AS bucket_key,
             COALESCE(SUM(amount), 0) AS total_amount
      FROM payments
      WHERE user_id = ? 
        AND status = 'successful'
        AND paid_at >= ?
        AND (currency IS NULL OR UPPER(currency) = ?)
      GROUP BY DATE_FORMAT(paid_at, '%Y-%m')
      ORDER BY bucket_key ASC
    `;
    const [rows] = await dbPromise.execute(query, [userId, fromStr, currency]);
    const map = new Map(rows.map(r => [String(r.bucket_key), Number(r.total_amount || 0)]));

    const series = buckets.map(b => ({
      month: b.key,
      month_name: b.label,
      total_amount: map.get(b.key) || 0
    }));

    return res.json(series);
  } catch (error) {
    console.error('Trends analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch trends data' });
  }
});

export default router;
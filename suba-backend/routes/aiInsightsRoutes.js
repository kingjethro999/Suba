// suba-backend/routes/aiInsightsRoutes.js
import express from 'express';
import { dbPromise } from '../models/db.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import geminiService from '../services/geminiAIService.js';

const router = express.Router();

// See requests in server logs
router.use((req, res, next) => {
  console.log(`🤖 AI route hit: ${req.method} ${req.originalUrl}`);
  next();
});

// Quick test endpoint
router.get('/test', (req, res) => {
  res.json({ ok: true, route: 'ai' });
});

// Helpers
const toDate = (val) => (val ? new Date(val) : null);
const daysBetween = (a, b) => Math.round((a - b) / (1000 * 60 * 60 * 24));
const monthlyEquivalent = (amount, cycle) => {
  const amt = Number(amount) || 0;
  switch ((cycle || 'monthly').toLowerCase()) {
    case 'weekly': return amt * 4.33;
    case 'yearly': return amt / 12;
    case 'daily': return amt * 30;
    default: return amt;
  }
};

async function getUserData(userId) {
  const [subsRows] = await dbPromise.execute(
    `SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('active','paused')`,
    [userId]
  );

  const [payStats] = await dbPromise.execute(
    `SELECT 
       subscription_id,
       COUNT(*) AS payment_count,
       SUM(amount) AS total_amount,
       AVG(amount) AS avg_amount,
       MAX(paid_at) AS last_paid_at,
       MIN(paid_at) AS first_paid_at
     FROM payments 
     WHERE user_id = ? AND status = 'successful'
     GROUP BY subscription_id`,
    [userId]
  );

  const paymentsBySub = new Map();
  payStats.forEach(p => paymentsBySub.set(p.subscription_id, p));

  const now = new Date();

  const enrichedSubs = subsRows.map(s => {
    const pay = paymentsBySub.get(s.id);
    const monthly = monthlyEquivalent(s.amount, s.billing_cycle);
    const lastPaidAt = toDate(pay?.last_paid_at);
    const nextDue = toDate(s.next_billing_date);
    const daysSinceLast = lastPaidAt ? daysBetween(now, lastPaidAt) : null;
    const dueInDays = nextDue ? daysBetween(nextDue, now) : null;
    return {
      ...s,
      monthly_equivalent: monthly,
      payment_stats: {
        payment_count: Number(pay?.payment_count || 0),
        total_amount: Number(pay?.total_amount || 0),
        avg_amount: Number(pay?.avg_amount || 0),
        last_paid_at: pay?.last_paid_at || null,
        first_paid_at: pay?.first_paid_at || null,
        days_since_last_payment: daysSinceLast,
      },
      due_in_days: dueInDays,
    };
  });

  const cats = {};
  for (const s of enrichedSubs) {
    const c = s.category || 'Uncategorized';
    cats[c] = cats[c] || [];
    cats[c].push(s);
  }

  const priceChangeCandidates = enrichedSubs
    .filter(s => s.payment_stats.payment_count >= 2)
    .map(s => {
      const diff = Number(s.amount || 0) - Number(s.payment_stats.avg_amount || 0);
      const pct = s.payment_stats.avg_amount ? (diff / s.payment_stats.avg_amount) : 0;
      return { sub: s, pctDiff: pct, absDiff: diff };
    })
    .filter(x => Math.abs(x.pctDiff) > 0.15);

  const lowUsage = enrichedSubs.filter(s => s.auto_renew && ((s.payment_stats.days_since_last_payment || 9999) > 45));
  const dueSoon = enrichedSubs.filter(s => s.due_in_days !== null && s.due_in_days >= 0 && s.due_in_days <= 7);
  const freeTrials = enrichedSubs.filter(s =>
    (String(s.name || '').toLowerCase().includes('trial')) ||
    (Number(s.amount) === 0) ||
    (String(s.notes || '').toLowerCase().includes('trial'))
  );

  const currency = enrichedSubs[0]?.currency || 'NGN';
  const totalMonthly = enrichedSubs.reduce((sum, s) => sum + (s.monthly_equivalent || 0), 0);
  const expensive = enrichedSubs.filter(s => Number(s.amount) >= (currency === 'NGN' ? 5000 : 20));

  const categoryTotals = Object.entries(cats).map(([k, arr]) => ({
    category: k,
    monthly_total: arr.reduce((sum, s) => sum + (s.monthly_equivalent || 0), 0),
    count: arr.length
  })).sort((a, b) => b.monthly_total - a.monthly_total);

  return {
    currency,
    total_monthly: totalMonthly,
    subscriptions: enrichedSubs,
    category_totals: categoryTotals,
    overlaps: Object.entries(cats)
      .filter(([, list]) => list.length > 1)
      .map(([cat, list]) => ({ category: cat, names: list.map(s => s.name) })),
  price_changes: priceChangeCandidates,
    low_usage: lowUsage,
    due_soon: dueSoon,
    free_trials: freeTrials,
    expensive,
  };
}

// GET unresolved insights
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await dbPromise.execute(
      `SELECT id, type, message, affected_services, confidence_score, resolved, generated_at
       FROM ai_insights
       WHERE user_id = ? AND resolved = 0
       ORDER BY generated_at DESC`,
      [userId]
    );

    const parsed = rows.map(r => ({
      id: r.id,
      type: r.type,
      message: r.message,
      affected_services: (() => {
        try { return JSON.parse(r.affected_services || '[]'); } catch { return []; }
      })(),
      confidence_score: r.confidence_score !== null ? Number(r.confidence_score) : null,
      resolved: !!r.resolved,
      generated_at: r.generated_at
    }));

    res.json(parsed);
  } catch (e) {
    console.error('AI insights fetch error:', e);
    res.status(500).json({ error: 'Failed to fetch AI insights' });
  }
});

// PUT resolve
router.put('/insights/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const [result] = await dbPromise.execute(
      `UPDATE ai_insights SET resolved = 1 WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Insight not found' });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('Resolve error:', e);
    res.status(500).json({ error: 'Failed to resolve insight' });
  }
});

// POST generate insights
router.post('/insights/generate', authMiddleware, async (req, res) => {
  const conn = await dbPromise.getConnection();
  try {
    const userId = req.user.id;
    const features = await getUserData(userId);

    const generated = await geminiService.generateInsights(features);
    const insights = Array.isArray(generated) ? generated : [];

    const [existingRows] = await dbPromise.execute(
      `SELECT message FROM ai_insights WHERE user_id = ? AND resolved = 0`,
      [userId]
    );
    const existingMsgs = new Set(existingRows.map(r => r.message));

    await conn.beginTransaction();

    for (const ins of insights) {
      const type = ins.type || 'suggestion';
      const msg = (ins.message || '').trim();
      if (!msg || existingMsgs.has(msg)) continue;

      const aff = JSON.stringify(Array.isArray(ins.affected_services) ? ins.affected_services.slice(0, 10) : []);
      const conf = (typeof ins.confidence_score === 'number') ? ins.confidence_score : null;

      await conn.execute(
        `INSERT INTO ai_insights (user_id, type, message, affected_services, confidence_score, resolved) 
         VALUES (?, ?, ?, ?, ?, 0)`,
        [userId, type, msg, aff, conf]
      );
    }

    await conn.commit();

    const [rows] = await dbPromise.execute(
      `SELECT id, type, message, affected_services, confidence_score, resolved, generated_at
       FROM ai_insights
       WHERE user_id = ? AND resolved = 0
       ORDER BY generated_at DESC`,
      [userId]
    );

    const parsed = rows.map(r => ({
      id: r.id,
      type: r.type,
      message: r.message,
      affected_services: (() => {
        try { return JSON.parse(r.affected_services || '[]'); } catch { return []; }
      })(),
      confidence_score: r.confidence_score !== null ? Number(r.confidence_score) : null,
      resolved: !!r.resolved,
      generated_at: r.generated_at
    }));

    res.json(parsed);
  } catch (e) {
    await conn.rollback();
    console.error('AI generate error:', e);
    res.status(500).json({ error: 'Failed to generate AI insights' });
  } finally {
    conn.release();
  }
});

export default router;
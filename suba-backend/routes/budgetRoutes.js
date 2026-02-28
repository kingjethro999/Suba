import express from 'express';
import { dbPromise } from '../models/db.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Get current user's budget
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const [[row]] = await dbPromise.execute(
      'SELECT default_monthly_budget, default_currency FROM users WHERE id = ?',
      [userId]
    );
    const budget = row?.default_monthly_budget ? Number(row.default_monthly_budget) : 0;
    res.json({ budget, currency: row?.default_currency || 'NGN' });
  } catch (e) {
    console.error('GET /budget error:', e);
    res.status(500).json({ error: 'Failed to get budget' });
  }
});

// Update current user's budget
router.put('/', async (req, res) => {
  try {
    const userId = req.user.id;
    let { budget } = req.body;

    if (budget === undefined || budget === null || budget === '') {
      return res.status(400).json({ error: 'Budget is required' });
    }

    const n = Number(budget);
    if (Number.isNaN(n) || n < 0) {
      return res.status(400).json({ error: 'Budget must be a non-negative number' });
    }

    // cap to a reasonable max
    const safe = Math.min(n, 999999999.99);

    await dbPromise.execute(
      'UPDATE users SET default_monthly_budget = ? WHERE id = ?',
      [safe.toFixed(2), userId]
    );

    res.json({ message: 'Budget updated', budget: Number(safe.toFixed(2)) });
  } catch (e) {
    console.error('PUT /budget error:', e);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

export default router;
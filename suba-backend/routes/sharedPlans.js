import express from 'express';
import { dbPromise } from '../models/db.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Use real auth middleware
router.use(authMiddleware);

// Logger
router.use((req, res, next) => {
  console.log(`👥 SharedPlans route: ${req.method} ${req.originalUrl}`);
  next();
});

// Quick test
router.get('/test', (req, res) => {
  res.json({ ok: true, route: 'shared-plans' });
});

// Get all shared plans for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching shared plans for user:', userId);

    const [sharedPlans] = await dbPromise.execute(
      `
      SELECT DISTINCT sp.*, u.full_name AS owner_name, u.email AS owner_email
      FROM shared_plans sp
      LEFT JOIN users u ON sp.user_id = u.id
      LEFT JOIN shared_plan_participants spp ON sp.id = spp.plan_id
      WHERE sp.user_id = ?
         OR spp.user_id = ?
      ORDER BY sp.created_at DESC
      `,
      [userId, userId]
    );

    if (!sharedPlans || sharedPlans.length === 0) {
      return res.json([]);
    }

    const planIds = sharedPlans.map(p => p.id);
    const placeholders = planIds.map(() => '?').join(',');
    const [allParticipants] = await dbPromise.execute(
      `
      SELECT spp.*, u.full_name AS user_name, u.email AS user_email, u.avatar_url, spp.plan_id
      FROM shared_plan_participants spp
      LEFT JOIN users u ON spp.user_id = u.id
      WHERE spp.plan_id IN (${placeholders})
      ORDER BY spp.created_at ASC
      `,
      planIds
    );

    const participantsByPlan = allParticipants.reduce((acc, p) => {
      acc[p.plan_id] = acc[p.plan_id] || [];
      acc[p.plan_id].push(p);
      return acc;
    }, {});

    const plansWithParticipants = sharedPlans.map(plan => {
      plan.participants = participantsByPlan[plan.id] || [];
      return plan;
    });

    res.json(plansWithParticipants);
  } catch (error) {
    console.error('Error fetching shared plans:', error.stack || error);
    res.status(500).json({ error: 'Failed to fetch shared plans', details: error.message });
  }
});

// Create a new shared plan
router.post('/', async (req, res) => {
  let connection;
  try {
    const { plan_name, total_amount, split_type, max_participants, participant_emails } = req.body;
    const userId = req.user.id;

    if (!plan_name || !total_amount || !split_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    connection = await dbPromise.getConnection();
    await connection.beginTransaction();

    // Verify owner exists
    const [ownerExists] = await connection.execute('SELECT id FROM users WHERE id = ?', [userId]);
    if (!ownerExists || ownerExists.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Invalid user ID. Owner not found.' });
    }

    // Insert plan
    const [planResult] = await connection.execute(
      `INSERT INTO shared_plans (user_id, plan_name, total_amount, split_type, max_participants, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [userId, plan_name, total_amount, split_type, max_participants || 2]
    );
    const planId = planResult.insertId;

    // Normalize and de-duplicate emails, exclude owner
    const emails = Array.isArray(participant_emails)
      ? [...new Set(participant_emails.map(e => e && e.trim()).filter(Boolean))]
      : [];

    let foundUserIds = [];
    if (emails.length > 0) {
      const emailPlaceholders = emails.map(() => '?').join(',');
      const [usersFound] = await connection.execute(
        `SELECT id, email FROM users WHERE email IN (${emailPlaceholders})`,
        emails
      );
      foundUserIds = [...new Set(usersFound.map(u => u.id))].filter(id => id !== userId);
    }

    // Compute equal split if needed
    let ownerSplit = Number(total_amount);
    let participantSplit = 0;
    if (split_type === 'equal') {
      const totalParticipants = 1 + foundUserIds.length;
      const perSplit = Number(total_amount) / Math.max(totalParticipants, 1);
      ownerSplit = Number(perSplit.toFixed(2));
      participantSplit = Number(perSplit.toFixed(2));
    }

    // Add owner as accepted
    await connection.execute(
      `INSERT INTO shared_plan_participants (plan_id, user_id, status, split_amount)
       VALUES (?, ?, 'accepted', ?)`,
      [planId, userId, ownerSplit]
    );

    // Add invited participants (if any)
    if (foundUserIds.length > 0) {
      const participantPlaceholders = foundUserIds.map(() => '(?, ?, ?, ?)').join(',');
      const participantValues = [];
      for (const uid of foundUserIds) {
        participantValues.push(planId, uid, 'invited', split_type === 'equal' ? participantSplit : 0);
      }
      // If you added UNIQUE(plan_id, user_id), IGNORE prevents duplicates.
      await connection.execute(
        `INSERT IGNORE INTO shared_plan_participants (plan_id, user_id, status, split_amount) VALUES ${participantPlaceholders}`,
        participantValues
      );
    }

    await connection.commit();

    // Return created plan with participants
    const [[newPlan]] = await dbPromise.execute(`SELECT * FROM shared_plans WHERE id = ?`, [planId]);
    const [participants] = await dbPromise.execute(
      `SELECT spp.*, u.full_name, u.email, u.avatar_url
       FROM shared_plan_participants spp
       LEFT JOIN users u ON spp.user_id = u.id
       WHERE spp.plan_id = ?
       ORDER BY spp.created_at ASC`,
      [planId]
    );
    newPlan.participants = participants || [];
    res.status(201).json(newPlan);
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (rbErr) {
        console.error('Rollback error:', rbErr.stack || rbErr);
      }
    }
    console.error('Error creating shared plan:', error.stack || error);
    res.status(500).json({ error: 'Failed to create shared plan', details: error.message });
  } finally {
    if (connection) {
      try { connection.release(); } catch (releaseErr) {
        console.error('Connection release error:', releaseErr.stack || releaseErr);
      }
    }
  }
});

// Accept shared plan invitation
router.patch('/participants/:participantId/accept', async (req, res) => {
  try {
    const { participantId } = req.params;
    const userId = req.user.id;

    const [result] = await dbPromise.execute(
      `UPDATE shared_plan_participants
         SET status = 'accepted'
       WHERE id = ? AND user_id = ? AND status = 'invited'`,
      [participantId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    console.error('Error accepting invitation:', error.stack || error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Decline shared plan invitation
router.patch('/participants/:participantId/decline', async (req, res) => {
  try {
    const { participantId } = req.params;
    const userId = req.user.id;

    const [result] = await dbPromise.execute(
      `UPDATE shared_plan_participants
         SET status = 'declined'
       WHERE id = ? AND user_id = ? AND status = 'invited'`,
      [participantId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error('Error declining invitation:', error.stack || error);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
});

export default router;
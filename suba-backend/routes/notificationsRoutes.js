// suba-backend/routes/notificationsRoutes.js
import express from 'express';
import { dbPromise } from '../models/db.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Get notifications for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const [notifications] = await dbPromise.execute(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as seen
router.patch('/:id/seen', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await dbPromise.execute(
      `UPDATE notifications
       SET seen = 1
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    res.json({ message: 'Notification marked as seen' });
  } catch (error) {
    console.error('Error marking notification as seen:', error);
    res.status(500).json({ error: 'Failed to mark notification as seen' });
  }
});

// Mark all notifications as seen
router.patch('/mark-all-seen', async (req, res) => {
  try {
    const userId = req.user.id;

    await dbPromise.execute(
      `UPDATE notifications
       SET seen = 1
       WHERE user_id = ? AND seen = 0`,
      [userId]
    );

    res.json({ message: 'All notifications marked as seen' });
  } catch (error) {
    console.error('Error marking all notifications as seen:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as seen' });
  }
});

// Create a notification (for internal use)
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, title, message } = req.body;

    const [result] = await dbPromise.execute(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES (?, ?, ?, ?)`,
      [userId, type, title, message]
    );

    res.status(201).json({
      message: 'Notification created',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

export default router;
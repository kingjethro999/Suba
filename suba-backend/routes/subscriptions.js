// suba-backend/routes/subscriptions.js
import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  addSubscription,
  getSubscriptions,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  cancelSubscription
} from '../controllers/subscriptionController.js';

const router = express.Router();

router.post('/', authMiddleware, addSubscription);
router.get('/', authMiddleware, getSubscriptions);
router.get('/:id', authMiddleware, getSubscriptionById);
router.put('/:id', authMiddleware, updateSubscription);
router.put('/:id/cancel', authMiddleware, cancelSubscription); // NEW ROUTE
router.delete('/:id', authMiddleware, deleteSubscription);

export default router;
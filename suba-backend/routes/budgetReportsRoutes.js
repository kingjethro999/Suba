// suba-backend/routes/budgetReportsRoutes.js
import express from 'express';
import { dbPromise } from '../models/db.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

// Get budget reports for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const [reports] = await dbPromise.execute(
      `SELECT * FROM budget_reports
       WHERE user_id = ?
       ORDER BY report_month DESC
       LIMIT 12`,
      [userId]
    );

    // Parse JSON fields
    const processedReports = reports.map(report => ({
      ...report,
      category_breakdown: report.category_breakdown ? JSON.parse(report.category_breakdown) : null
    }));

    res.json(processedReports);
  } catch (error) {
    console.error('Error fetching budget reports:', error);
    res.status(500).json({ error: 'Failed to fetch budget reports' });
  }
});

// Generate budget report for a specific month
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.body; // Format: 'YYYY-MM'

    if (!month) {
      return res.status(400).json({ error: 'Month is required (format: YYYY-MM)' });
    }

    // Get subscriptions and payments for the month
    const [subscriptions] = await dbPromise.execute(
      `SELECT * FROM subscriptions
       WHERE user_id = ? AND status IN ('active', 'cancelled')
       AND DATE_FORMAT(created_at, '%Y-%m') <= ?`,
      [userId, month]
    );

    const [payments] = await dbPromise.execute(
      `SELECT p.*, s.name as subscription_name, s.category
       FROM payments p
       LEFT JOIN subscriptions s ON p.subscription_id = s.id
       WHERE p.user_id = ? AND DATE_FORMAT(p.paid_at, '%Y-%m') = ?
       AND p.status = 'successful'`,
      [userId, month]
    );

    // Calculate totals
    const totalSpent = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const recurringServices = subscriptions.filter(sub => sub.status === 'active').length;
    const newSubscriptions = subscriptions.filter(sub =>
      sub.created_at && new Date(sub.created_at).toISOString().slice(0, 7) === month
    ).length;
    const canceledSubscriptions = subscriptions.filter(sub =>
      sub.status === 'cancelled' &&
      sub.updated_at &&
      new Date(sub.updated_at).toISOString().slice(0, 7) === month
    ).length;

    // Get most expensive service
    const mostExpensiveService = subscriptions.length > 0 ?
      subscriptions.reduce((max, sub) =>
        Number(sub.amount) > Number(max.amount) ? sub : max
      ).name : null;

    // Calculate category breakdown
    const categoryBreakdown = {};
    payments.forEach(payment => {
      const category = payment.category || 'Other';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = 0;
      }
      categoryBreakdown[category] += Number(payment.amount);
    });

    // Save or update the report
    await dbPromise.execute(
      `INSERT INTO budget_reports
       (user_id, report_month, total_spent, recurring_services, new_subscriptions,
        canceled_subscriptions, most_expensive_service, category_breakdown)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       total_spent = VALUES(total_spent),
       recurring_services = VALUES(recurring_services),
       new_subscriptions = VALUES(new_subscriptions),
       canceled_subscriptions = VALUES(canceled_subscriptions),
       most_expensive_service = VALUES(most_expensive_service),
       category_breakdown = VALUES(category_breakdown)`,
      [
        userId,
        month,
        totalSpent,
        recurringServices,
        newSubscriptions,
        canceledSubscriptions,
        mostExpensiveService,
        JSON.stringify(categoryBreakdown)
      ]
    );

    res.json({
      message: 'Budget report generated successfully',
      report: {
        report_month: month,
        total_spent: totalSpent,
        recurring_services: recurringServices,
        new_subscriptions: newSubscriptions,
        canceled_subscriptions: canceledSubscriptions,
        most_expensive_service: mostExpensiveService,
        category_breakdown: categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Error generating budget report:', error);
    res.status(500).json({ error: 'Failed to generate budget report' });
  }
});

export default router;
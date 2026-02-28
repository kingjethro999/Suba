// suba-backend/controllers/subscriptionController.js
import { db } from '../models/db.js';

// ✅ Create Subscription (Updated with new schema)
export const addSubscription = (req, res) => {
  const {
    name,
    service_provider,
    category,
    amount,
    currency,
    billing_cycle,
    next_billing_date,
    auto_renew = true,
    reminder_days_before = 3,
    is_shared = false,
    notes,
    cancellation_link,
    logo_url,
    status = 'active'
  } = req.body;

  if (!name || !amount || !billing_cycle || !next_billing_date) {
    return res.status(400).json({ message: 'Required fields are missing' });
  }

  const sql = `
    INSERT INTO subscriptions 
    (user_id, name, service_provider, category, amount, currency, billing_cycle, 
     next_billing_date, auto_renew, reminder_days_before, is_shared, notes, 
     cancellation_link, logo_url, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      req.user.id,
      name,
      service_provider || null,
      category || null,
      amount,
      currency || 'NGN',
      billing_cycle,
      next_billing_date,
      auto_renew,
      reminder_days_before,
      is_shared,
      notes || null,
      cancellation_link || null,
      logo_url || null,
      status
    ],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });

      // Fetch the created subscription to return all fields
      const selectSql = `SELECT * FROM subscriptions WHERE id = ?`;
      db.query(selectSql, [result.insertId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        
        res.status(201).json(results[0]);
      });
    }
  );
};

// ✅ Read All Subscriptions (Include new fields)
export const getSubscriptions = (req, res) => {
  const sql = `
    SELECT *, 
           CASE 
             WHEN status = 'cancelled' THEN 0 
             ELSE 1 
           END as is_active 
    FROM subscriptions 
    WHERE user_id = ? 
    ORDER BY next_billing_date ASC
  `;

  db.query(sql, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    res.json(results);
  });
};

// ✅ Read Single Subscription
export const getSubscriptionById = (req, res) => {
  const sql = `SELECT * FROM subscriptions WHERE id = ? AND user_id = ?`;

  db.query(sql, [req.params.id, req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (results.length === 0) return res.status(404).json({ message: 'Subscription not found' });
    res.json(results[0]);
  });
};

// ✅ Update Subscription (Include new fields)
export const updateSubscription = (req, res) => {
  const { id } = req.params;
  const {
    name,
    service_provider,
    category,
    amount,
    currency,
    billing_cycle,
    next_billing_date,
    last_payment_date,
    auto_renew,
    reminder_days_before,
    is_shared,
    notes,
    cancellation_link,
    logo_url,
    status,
    skipped_at,
    next_reminder_date
  } = req.body;

  const sql = `
    UPDATE subscriptions 
    SET name = ?, service_provider = ?, category = ?, amount = ?, currency = ?, 
        billing_cycle = ?, next_billing_date = ?, last_payment_date = ?, 
        auto_renew = ?, reminder_days_before = ?, is_shared = ?, notes = ?, 
        cancellation_link = ?, logo_url = ?, status = ?, skipped_at = ?, 
        next_reminder_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `;

  db.query(
    sql,
    [
      name,
      service_provider || null,
      category || null,
      amount,
      currency || 'NGN',
      billing_cycle,
      next_billing_date,
      last_payment_date || null,
      auto_renew ?? true,
      reminder_days_before ?? 3,
      is_shared ?? false,
      notes || null,
      cancellation_link || null,
      logo_url || null,
      status || 'active',
      skipped_at || null,
      next_reminder_date || null,
      id,
      req.user.id
    ],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Database error', error: err });
      if (result.affectedRows === 0) return res.status(404).json({ message: 'Subscription not found or no changes made' });

      // Return updated subscription
      const selectSql = `SELECT * FROM subscriptions WHERE id = ?`;
      db.query(selectSql, [id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.json(results[0]);
      });
    }
  );
};

// ✅ Cancel Subscription
export const cancelSubscription = (req, res) => {
  const { id } = req.params;

  const sql = `
    UPDATE subscriptions 
    SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `;

  db.query(sql, [id, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Subscription not found' });

    res.json({ message: 'Subscription cancelled successfully' });
  });
};

// ✅ Delete Subscription
export const deleteSubscription = (req, res) => {
  const sql = `DELETE FROM subscriptions WHERE id = ? AND user_id = ?`;

  db.query(sql, [req.params.id, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Database error', error: err });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Subscription not found' });

    res.json({ message: 'Subscription deleted successfully' });
  });
};
// suba-backend/routes/healthRoutes.js
import express from 'express';
import { db } from '../models/db.js';

const router = express.Router();

router.get('/health', (req, res) => {
  db.getConnection((err, connection) => {
    if (err) {
      res.status(500).json({ status: 'Database connection failed', error: err.message });
    } else {
      connection.ping((pingErr) => {
        connection.release();
        if (pingErr) {
          res.status(500).json({ status: 'Database ping failed', error: pingErr.message });
        } else {
          res.json({ status: 'OK', database: 'Connected' });
        }
      });
    }
  });
});

export default router;
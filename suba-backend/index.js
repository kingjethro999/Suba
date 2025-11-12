// suba-backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import subscriptionRoutes from './routes/subscriptions.js';
import userRoutes from './routes/userRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import analyticsRoutes from './routes/analytics.js';
import sharedPlansRoutes from './routes/sharedPlans.js';
import paymentRoutes from './routes/paymentsRoutes.js';
import aiInsightsRoutes from './routes/aiInsightsRoutes.js';
import budgetRoutes from './routes/budgetRoutes.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/shared-plans', sharedPlansRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/ai', aiInsightsRoutes);
app.use('/api/budget', budgetRoutes);

app.get('/api/shared-plans/test', (req, res) => res.json({ ok: true, route: 'shared-plans' }));
app.get('/api/payments/test', (req, res) => res.json({ message: 'Payments endpoint is working!' }));

app.get('/', (req, res) => res.send('✅ API is running...'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('📦 Routes loaded:');
  console.log('   - /api/auth');
  console.log('   - /api/subscriptions');
  console.log('   - /api/user');
  console.log('   - /api/analytics');
  console.log('   - /api/health');
  console.log('   - /api/shared-plans');
  console.log('   - /api/payments');
  console.log('   - /api/ai');
});
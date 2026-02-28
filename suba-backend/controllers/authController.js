// suba-backend/controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../models/db.js';

// Register + Auto-login
export const register = async (req, res) => {
  const { full_name, email, password } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Database error in register:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { full_name, email, password_hash: hashedPassword };

    db.query('INSERT INTO users SET ?', user, (err, result) => {
      if (err) {
        console.error('Database error in register insert:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      const newUserId = result.insertId;
      const token = jwt.sign(
        { id: newUserId, email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully.',
        token,
        user: {
          id: newUserId,
          full_name,
          email,
          avatar_url: null,
          country: null,
          default_currency: 'NGN',
        },
      });
    });
  });
};

// Login
export const login = (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error('Database error in login:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ message: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url || null,
        country: user.country || null,
        default_currency: user.default_currency || 'NGN',
      },
    });
  });
};

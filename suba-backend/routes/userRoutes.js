// suba-backend/routes/userRoutes.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import authMiddleware from '../middlewares/authMiddleware.js';
import { db } from '../models/db.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, phone_number, country, default_currency, prefers_dark_mode } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (country !== undefined) updateData.country = country;
    if (default_currency !== undefined) updateData.default_currency = default_currency;
    if (prefers_dark_mode !== undefined) updateData.prefers_dark_mode = prefers_dark_mode;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'No valid fields to update' 
      });
    }

    db.query('UPDATE users SET ? WHERE id = ?', [updateData, userId], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ 
          success: false,
          message: 'Database error', 
          error: err.message 
        });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      // Get updated user data
      db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
          return res.status(500).json({ 
            success: false,
            message: 'Database error', 
            error: err.message 
          });
        }
        
        const updatedUser = results[0];
        res.json({
          success: true,
          message: 'Profile updated successfully',
          user: {
            id: updatedUser.id,
            full_name: updatedUser.full_name,
            email: updatedUser.email,
            phone_number: updatedUser.phone_number,
            country: updatedUser.country,
            avatar_url: updatedUser.avatar_url,
            default_currency: updatedUser.default_currency,
            prefers_dark_mode: updatedUser.prefers_dark_mode
          }
        });
      });
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Upload avatar - UPDATED WITH BETTER ERROR HANDLING
router.post('/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  try {
    console.log('Avatar upload request received');
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    console.log('File uploaded:', req.file);
    
    const userId = req.user.id;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    console.log('Updating user avatar for user:', userId);
    
    db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl, userId], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        // Delete the uploaded file if database update fails
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('Deleted uploaded file due to database error');
        }
        return res.status(500).json({ 
          success: false,
          message: 'Database error', 
          error: err.message 
        });
      }

      console.log('Avatar updated successfully:', avatarUrl);
      
      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatarUrl: avatarUrl
      });
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    // Make sure to delete the file if any error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('Deleted uploaded file due to server error');
    }
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed'
    });
  }
  
  next(error);
});

// Delete account
router.delete('/account', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    db.beginTransaction((err) => {
      if (err) {
        return res.status(500).json({ 
          success: false,
          message: 'Database error', 
          error: err.message 
        });
      }

      // Delete user's subscriptions first (due to foreign key constraints)
      db.query('DELETE FROM subscriptions WHERE user_id = ?', [userId], (err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ 
              success: false,
              message: 'Database error', 
              error: err.message 
            });
          });
        }

        // Delete user
        db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ 
                success: false,
                message: 'Database error', 
                error: err.message 
              });
            });
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ 
                  success: false,
                  message: 'Database error', 
                  error: err.message 
                });
              });
            }

            res.json({ 
              success: true,
              message: 'Account deleted successfully' 
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

export default router;
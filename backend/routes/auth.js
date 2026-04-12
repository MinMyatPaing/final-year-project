const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authCheck = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me  — protected: verifies JWT and returns current user
router.get('/me', authCheck, authController.me);

// PATCH /api/auth/profile — update display name (protected)
router.patch('/profile', authCheck, authController.updateProfile);

module.exports = router;

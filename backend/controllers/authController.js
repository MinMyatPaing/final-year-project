const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

function createToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  };
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const user = new User({ name, email, password });
    await user.save();

    const token = createToken(user);
    res.cookie('token', token, cookieOptions());

    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const isValid = await user.comparePassword(password);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = createToken(user);
    res.cookie('token', token, cookieOptions());

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie('token');
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

/**
 * PATCH /api/auth/profile
 * Update the authenticated user's display name.
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name: name.trim() },
      { new: true, runValidators: true }
    ).select('-password'); // this will return the updated user document without the password field

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user (requires authCheck middleware).
 */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

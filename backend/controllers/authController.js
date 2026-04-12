const axios  = require('axios');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

const JWT_SECRET    = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
const AGENT_URL     = process.env.AGENT_API_URL || 'http://localhost:8000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   1000 * 60 * 60 * 24 * 7,
  };
}

/** Consistent shape returned in every auth response. */
function serializeUser(user) {
  return {
    id:                       user._id,
    name:                     user.name,
    email:                    user.email,
    university:               user.university  || '',
    yearOfStudy:              user.yearOfStudy || '',
    monthlyIncome:            user.monthlyIncome            || 0,
    monthlySpendingGoal:      user.monthlySpendingGoal      || 0,
    aiPersonalisationConsent: user.aiPersonalisationConsent || false,
  };
}

/**
 * Fire-and-forget: sync the user's profile to the AI vector store.
 * Only called when the user has given aiPersonalisationConsent.
 */
function syncProfileVector(user) {
  if (!user.aiPersonalisationConsent) return;
  axios
    .post(`${AGENT_URL}/vectors/upsert-profile`, {
      user:    serializeUser(user),
      user_id: user._id.toString(),
    })
    .catch((err) => console.warn('[vector-sync] profile upsert failed:', err.message));
}

// ─── Route handlers ───────────────────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const {
      name, email, password,
      university, yearOfStudy,
      monthlyIncome, monthlySpendingGoal,
      aiPersonalisationConsent,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = new User({
      name,
      email,
      password,
      university:               university               || '',
      yearOfStudy:              yearOfStudy              || '',
      monthlyIncome:            parseFloat(monthlyIncome)  || 0,
      monthlySpendingGoal:      parseFloat(monthlySpendingGoal) || 0,
      aiPersonalisationConsent: !!aiPersonalisationConsent,
    });
    await user.save();

    // Sync profile to vector store if user consented
    syncProfileVector(user);

    const token = createToken(user);
    res.cookie('token', token, cookieOptions());
    res.status(201).json({ success: true, token, user: serializeUser(user) });
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
    res.json({ success: true, token, user: serializeUser(user) });
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
 * Update name and/or extended profile fields.
 */
exports.updateProfile = async (req, res) => {
  try {
    const {
      name, university, yearOfStudy,
      monthlyIncome, monthlySpendingGoal,
      aiPersonalisationConsent,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const update = {
      name: name.trim(),
      ...(university            !== undefined && { university:            university || '' }),
      ...(yearOfStudy           !== undefined && { yearOfStudy:           yearOfStudy || '' }),
      ...(monthlyIncome         !== undefined && { monthlyIncome:         parseFloat(monthlyIncome) || 0 }),
      ...(monthlySpendingGoal   !== undefined && { monthlySpendingGoal:   parseFloat(monthlySpendingGoal) || 0 }),
      ...(aiPersonalisationConsent !== undefined && { aiPersonalisationConsent: !!aiPersonalisationConsent }),
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      update,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Sync profile to vector store
    syncProfileVector(user);

    res.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user with full profile.
 */
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user: serializeUser(user) });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

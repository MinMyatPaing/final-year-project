const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * authCheck middleware
 * Verifies JWT from Authorization header (Bearer token) or httpOnly cookie.
 * Returns 401 with a specific code on failure so the frontend can auto-logout.
 */
module.exports = function authCheck(req, res, next) {
  let token;

  // Prefer Authorization header, fall back to cookie
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired, please sign in again', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
};

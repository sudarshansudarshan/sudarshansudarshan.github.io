const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.chatengine_token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');

    // Handle dev bypass user - allow through without MongoDB lookup
    if (payload.devBypass) {
      req.user = {
        _id: payload.userId,
        googleId: 'dev-bypass-user',
        email: 'dev@local.chatengine',
        name: 'Local Dev User',
        picture: ''
      };
      return next();
    }

    if (payload.devBypass && payload.user) {
      res.clearCookie('chatengine_token');
      res.clearCookie('g_state');
      return res.status(401).json({ error: 'Dev bypass disabled' });
    }

    const user = await User.findById(payload.userId).lean();
    if (!user) return res.status(401).json({ error: 'Invalid session' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = { requireAuth };

const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const DEV_BYPASS_AUTH = (process.env.DEV_BYPASS_AUTH || 'true').toLowerCase() === 'true';

function issueAuthCookie(res, payload) {
  const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
  res.cookie('chatengine_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function getDevUser() {
  return {
    id: 'dev-bypass-user',
    email: 'dev@local.chatengine',
    name: 'Local Dev User',
    picture: ''
  };
}

async function upsertDevUser() {
  if (DEV_BYPASS_AUTH) {
    const devUser = getDevUser();
    return { _id: devUser.id, email: devUser.email, name: devUser.name, picture: devUser.picture };
  }
  return User.findOneAndUpdate(
    { googleId: 'dev-bypass-user' },
    {
      googleId: 'dev-bypass-user',
      email: 'dev@local.chatengine',
      name: 'Local Dev User',
      picture: ''
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required' });
    const ticket = await client.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) return res.status(400).json({ error: 'Invalid Google profile' });

    const user = await User.findOneAndUpdate(
      { googleId: payload.sub },
      { googleId: payload.sub, email: payload.email, name: payload.name || payload.email, picture: payload.picture || '' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    issueAuthCookie(res, { userId: user._id.toString() });
    res.json({ user: { id: user._id, email: user.email, name: user.name, picture: user.picture } });
  } catch (error) {
    console.error('Google auth failed:', error.message);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.chatengine_token;
    if (!token) {
      // Dev bypass mode - create a local dev user
      if (DEV_BYPASS_AUTH) {
        const devUser = getDevUser();
        const devPayload = { userId: devUser.id, devBypass: true };
        issueAuthCookie(res, devPayload);
        return res.json({ user: devUser });
      }
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    if (payload.devBypass && payload.user) {
      res.clearCookie('chatengine_token');
      res.clearCookie('g_state');
      return res.status(401).json({ error: 'Dev bypass disabled' });
    }
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: { id: user._id, email: user.email, name: user.name, picture: user.picture } });
  } catch {
    res.clearCookie('chatengine_token');
    res.clearCookie('g_state');
    return res.status(401).json({ error: 'Not authenticated' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('chatengine_token');
  res.json({ success: true });
});

module.exports = router;

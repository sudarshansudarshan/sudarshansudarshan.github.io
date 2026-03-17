const express = require('express');
const Session = require('../models/Session');
const Message = require('../models/Message');
const { store, makeId } = require('../devStore');

const router = express.Router();
const DEV_BYPASS_AUTH = (process.env.DEV_BYPASS_AUTH || 'true').toLowerCase() === 'true';

router.get('/', async (req, res) => {
  try {
    if (DEV_BYPASS_AUTH && String(req.user._id) === 'dev-bypass-user') {
      const sessions = store.sessions
        .filter((s) => s.userId === 'dev-bypass-user')
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      return res.json(sessions);
    }
    const sessions = await Session.find({ userId: req.user._id }).sort({ updatedAt: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (DEV_BYPASS_AUTH && String(req.user._id) === 'dev-bypass-user') {
      const session = store.sessions.find((s) => s._id === req.params.id && s.userId === 'dev-bypass-user');
      if (!session) return res.status(404).json({ error: 'Session not found' });
      const messages = store.messagesBySession[session._id] || [];
      return res.json({ session, messages });
    }
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const messages = await Message.find({ sessionId: session._id }).sort({ createdAt: 1 });
    res.json({ session, messages });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (DEV_BYPASS_AUTH && String(req.user._id) === 'dev-bypass-user') {
      const now = new Date().toISOString();
      const session = { _id: makeId('session'), userId: 'dev-bypass-user', title: req.body.title || 'New Conversation', createdAt: now, updatedAt: now };
      store.sessions.unshift(session);
      store.messagesBySession[session._id] = [];
      return res.status(201).json(session);
    }
    const session = await Session.create({ userId: req.user._id, title: req.body.title || 'New Conversation' });
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: req.body.title || 'Untitled Chat' },
      { new: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (DEV_BYPASS_AUTH && String(req.user._id) === 'dev-bypass-user') {
      const idx = store.sessions.findIndex((s) => s._id === req.params.id && s.userId === 'dev-bypass-user');
      if (idx === -1) return res.status(404).json({ error: 'Session not found' });
      store.sessions.splice(idx, 1);
      delete store.messagesBySession[req.params.id];
      return res.json({ success: true });
    }
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await Message.deleteMany({ sessionId: session._id });
    await Session.deleteOne({ _id: session._id });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;

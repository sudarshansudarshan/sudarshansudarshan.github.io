const express = require('express');
const Message = require('../models/Message');
const Session = require('../models/Session');

const router = express.Router();

async function assertOwnedSession(sessionId, userId) {
  return Session.findOne({ _id: sessionId, userId });
}

router.get('/', async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const session = await assertOwnedSession(sessionId, req.user._id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const messages = await Message.find({ sessionId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { sessionId, role, content } = req.body;
    if (!sessionId || !role || !content?.trim()) return res.status(400).json({ error: 'Missing required fields' });
    const session = await assertOwnedSession(sessionId, req.user._id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const message = await Message.create({ sessionId, role, content: content.trim() });
    if (role === 'user') {
      const count = await Message.countDocuments({ sessionId, role: 'user' });
      if (count === 1) session.title = content.trim().slice(0, 50) + (content.trim().length > 50 ? '...' : '');
    }
    session.updatedAt = new Date();
    await session.save();
    res.status(201).json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

module.exports = router;

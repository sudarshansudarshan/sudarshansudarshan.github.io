const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Message = require('../models/Message');
const Session = require('../models/Session');
const { store, makeId } = require('../devStore');

const router = express.Router();
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789';
const OPENCLAW_CHAT_PATH = process.env.OPENCLAW_CHAT_PATH || '/api/chat';
const OPENCLAW_API_KEY = process.env.OPENCLAW_API_KEY || '';
const SKILL_FILE = process.env.SKILL_FILE || '../SKILL.md';
const ENABLE_MOCK_FALLBACK = (process.env.ENABLE_MOCK_FALLBACK || 'true').toLowerCase() === 'true';
const DEV_BYPASS_AUTH = (process.env.DEV_BYPASS_AUTH || 'true').toLowerCase() === 'true';

function loadSkillContext() {
  try {
    // Use absolute path directly if SKILL_FILE is already absolute
    let skillPath = SKILL_FILE;
    if (!path.isAbsolute(skillPath)) {
      skillPath = path.resolve(__dirname, SKILL_FILE);
    }
    console.log('Loading SKILL.md from:', skillPath);
    return fs.readFileSync(skillPath, 'utf8');
  } catch (error) {
    console.warn('Could not read SKILL.md:', error.message);
    return 'No SKILL.md context available.';
  }
}

function buildMockReply({ message, user, skillContext }) {
  const skillPreview = skillContext
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(' ')
    .slice(0, 280);

  return [
    `Mock Chat Engine reply for ${user.name}:`,
    `You said: "${message}"`,
    '',
    'OpenClaw is currently unavailable or not yet wired to the expected endpoint, so this fallback response is being generated locally.',
    skillPreview ? `SKILL.md context preview: ${skillPreview}` : 'SKILL.md context could not be loaded.',
    '',
    'Next step: configure the real OpenClaw endpoint and replace the Google/Mongo placeholders to switch from mock mode to live mode.'
  ].join('\n');
}

router.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message?.trim() || !sessionId) return res.status(400).json({ error: 'message and sessionId are required' });

    let session;
    let userMessage;
    let priorMessages;

    if (DEV_BYPASS_AUTH && String(req.user._id) === 'dev-bypass-user') {
      session = store.sessions.find((s) => s._id === sessionId && s.userId === 'dev-bypass-user');
      if (!session) return res.status(404).json({ error: 'Session not found' });
      userMessage = { _id: makeId('msg'), sessionId, role: 'user', content: message.trim(), createdAt: new Date().toISOString() };
      store.messagesBySession[sessionId] = store.messagesBySession[sessionId] || [];
      store.messagesBySession[sessionId].push(userMessage);
      priorMessages = store.messagesBySession[sessionId];
    } else {
      session = await Session.findOne({ _id: sessionId, userId: req.user._id });
      if (!session) return res.status(404).json({ error: 'Session not found' });
      userMessage = await Message.create({ sessionId, role: 'user', content: message.trim() });
      priorMessages = await Message.find({ sessionId }).sort({ createdAt: 1 }).lean();
    }

    const transcript = priorMessages.map((entry) => `${entry.role.toUpperCase()}: ${entry.content}`).join('\n\n');
    const skillContext = loadSkillContext();
    const prompt = [
      'You are the AI engine for this website.',
      'Follow the product intent and behavior described below.',
      '',
      'SKILL.md:',
      skillContext,
      '',
      'Current user:',
      `${req.user.name} <${req.user.email}>`,
      '',
      'Conversation transcript so far:',
      transcript,
      '',
      'Reply to the latest USER message naturally.'
    ].join('\n');

    let assistantText;
    try {
      const isChatCompletions = OPENCLAW_CHAT_PATH.includes('/v1/chat/completions');
      const requestBody = isChatCompletions
        ? {
            model: 'openclaw:main',
            user: String(req.user._id || req.user.email || 'user'),
            messages: [
              { role: 'system', content: 'You are the AI engine for this website.' },
              { role: 'system', content: skillContext },
              { role: 'user', content: `Current user: ${req.user.name} <${req.user.email}>\n\nConversation transcript so far:\n${transcript}\n\nReply to the latest USER message naturally.` }
            ]
          }
        : { message: prompt, sessionId };

      const openclawRes = await axios.post(
        `${OPENCLAW_URL}${OPENCLAW_CHAT_PATH}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(OPENCLAW_API_KEY ? { Authorization: `Bearer ${OPENCLAW_API_KEY}` } : {}),
            ...(isChatCompletions ? { 'x-openclaw-agent-id': 'main' } : {})
          },
          timeout: 60000
        }
      );

      assistantText = isChatCompletions
        ? openclawRes.data?.choices?.[0]?.message?.content
        : (openclawRes.data?.response || openclawRes.data?.message || openclawRes.data?.reply);
    } catch (openclawError) {
      if (!ENABLE_MOCK_FALLBACK) {
        throw openclawError;
      }
      console.warn('OpenClaw unavailable, using mock fallback:', openclawError.response?.data || openclawError.message);
      assistantText = buildMockReply({ message: message.trim(), user: req.user, skillContext });
    }

    assistantText = assistantText || 'I could not generate a reply.';
    let assistantMessage;
    if (DEV_BYPASS_AUTH && String(req.user._id) === 'dev-bypass-user') {
      assistantMessage = { _id: makeId('msg'), sessionId, role: 'assistant', content: String(assistantText).trim(), createdAt: new Date().toISOString() };
      store.messagesBySession[sessionId].push(assistantMessage);
      session.updatedAt = new Date().toISOString();
      if (session.title === 'New Conversation') session.title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
    } else {
      assistantMessage = await Message.create({ sessionId, role: 'assistant', content: String(assistantText).trim() });
      session.updatedAt = new Date();
      if (session.title === 'New Conversation') session.title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
      await session.save();
    }
    res.json({ response: assistantMessage.content, userMessage, assistantMessage });
  } catch (error) {
    console.error('Error calling OpenClaw API:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') return res.status(503).json({ error: 'OpenClaw service unavailable' });
    res.status(500).json({ error: error.response?.data?.error || 'Failed to get AI response' });
  }
});

module.exports = router;

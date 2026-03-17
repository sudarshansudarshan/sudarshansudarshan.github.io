const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, trim: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

messageSchema.index({ sessionId: 1, createdAt: 1 });
module.exports = mongoose.model('Message', messageSchema);

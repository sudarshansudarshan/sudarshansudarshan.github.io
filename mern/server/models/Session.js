const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'New Conversation', trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);

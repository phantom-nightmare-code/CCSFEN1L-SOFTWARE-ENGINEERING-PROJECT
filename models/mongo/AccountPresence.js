const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: Number, required: true, unique: true },
  lastSeenAt: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('AccountPresence', schema);

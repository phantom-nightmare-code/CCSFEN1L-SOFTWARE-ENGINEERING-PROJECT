const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId:    { type: Number, index: true },
  action:    { type: String, required: true },  // login | logout | register | workout_created | payment | rental
  ip:        String,
  userAgent: String,
  metadata:  mongoose.Schema.Types.Mixed,
}, { timestamps: true });

schema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', schema);
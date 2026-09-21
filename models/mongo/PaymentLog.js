const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId:      { type: Number, index: true, required: true },
  amount:      { type: Number, required: true },
  currency:    { type: String, default: 'PHP' },
  method:      { type: String, enum: ['cash', 'gcash', 'maya', 'bank', 'card'], required: true },
  purpose:     { type: String, enum: ['membership', 'rental', 'walk-in'], required: true },
  referenceId: { type: Number },
  reference:   { type: String, index: true },
  status:      { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'paid' },
  details:     mongoose.Schema.Types.Mixed,

  verificationToken: { type: String, index: true },
  verifiedAt:  Date,
  rejectedAt:  Date,
  refundedAt:  Date,
}, { timestamps: true });

schema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentLog', schema);
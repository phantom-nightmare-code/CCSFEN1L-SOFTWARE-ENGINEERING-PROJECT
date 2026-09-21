const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  date:            { type: String, unique: true, index: true },  // YYYY-MM-DD
  logins:          { type: Number, default: 0 },
  registrations:   { type: Number, default: 0 },
  workoutsCreated: { type: Number, default: 0 },
  activeUsers:     { type: [Number], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('AdminMetric', schema);
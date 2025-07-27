const mongoose = require('mongoose');

const beeSchema = new mongoose.Schema({
  beeId: { type: String, required: true, unique: true }, // like "B123"
  ownerId: { type: String, required: true }, // Discord user ID
  xp: { type: Number, default: 0 },
  ep: { type: Number, default: 0 },
  adventure: {
  type: {
    type: String, // '1h', '3h', '8h'
    default: null,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  endsAt: {
    type: Date,
    default: null,
  }}
});

module.exports = mongoose.model('Bee', beeSchema);

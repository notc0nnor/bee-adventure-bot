const mongoose = require('mongoose');

const beeSchema = new mongoose.Schema({
  beeId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  ep: { type: Number, default: 0 },
  adventureCooldown: {
    type: Date,
    default: null,
  },
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
    }
  }
});

module.exports = mongoose.model('Bee', beeSchema);

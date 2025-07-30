const mongoose = require('mongoose');

const beeSchema = new mongoose.Schema({
  beeId: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  ep: { type: Number, default: 0 },
  onAdventureUntil: { type: Date, default: null },
  cooldownUntil: { type: Date, default: null },
    });

module.exports = mongoose.model('Bee', beeSchema);

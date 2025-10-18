// models/Inventory.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  key: { type: String, required: true }, // e.g. "nectar"
  name: { type: String, required: true }, // "Nectar"
  emoji: { type: String, required: true }, // "<:nectar:123...>"
  qty: { type: Number, default: 0 },
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  coins: { type: Number, default: 0 },
  flowers: { type: Number, default: 0 },
  items: { type: [ItemSchema], default: [] },
});

module.exports = mongoose.model('Inventory', inventorySchema);

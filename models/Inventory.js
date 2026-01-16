// models/Inventory.js
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },     // "Nectar"
  emoji: { type: String, required: true },    // "<:nectar:123...>"
  cost: { type: Number, required: true },     // 100
  ep: { type: Number, required: true },       // 10
  quantity: { type: Number, default: 1 },     // how many the user owns
}, { _id: false });

const inventorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  coins: { type: Number, default: 0 },
  flowers: { type: Number, default: 0 },
  items: { type: [ItemSchema], default: [] },
});

module.exports = mongoose.model('Inventory', inventorySchema);

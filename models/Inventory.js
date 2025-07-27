const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  coins: { type: Number, default: 0 },
  flowers: { type: Number, default: 0 },
});

module.exports = mongoose.model('Inventory', inventorySchema);

// Add Bee model schema for MongoDB

const mongoose = require("mongoose");

const beeSchema = new mongoose.Schema({
  id: String,
  ownerId: String,
  xp: Number,
  ep: Number,
  level: Number,
});

const Bee = mongoose.model("Bee", beeSchema);

module.exports = Bee;

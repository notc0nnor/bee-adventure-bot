// utils/shopHelpers.js
const mongoose = require('mongoose');
const Inventory = require('../models/Inventory'); // your Inventory model
const Bee = require('../models/Bee'); // your Bee model
const shopItems = require('../models/shop'); // the file you said is at models/shop.js

// ensure an inventory doc exists for a user
async function ensureInventory(userId) {
  let inv = await Inventory.findOne({ userId });
  if (!inv) {
    inv = new Inventory({ userId, coins: 0, flowers: 0, items: [] });
    await inv.save();
  }
  return inv;
}

function getItemDef(keyOrName) {
  const key = String(keyOrName).toLowerCase();
  // shopItems is an object with keys: nectar, honey, ...
  return Object.values(shopItems).find(
    it => it.key === key || it.name.toLowerCase() === key
  );
}

async function addItemToInventory(userId, itemKey, amount = 1, session = null) {
  const inv = await Inventory.findOne({ userId }).session(session);
  if (!inv) throw new Error('Inventory not found');
  const existing = inv.items.find(i => i.key === itemKey);
  const itemDef = shopItems[itemKey];
  if (!itemDef) throw new Error('Invalid itemKey');
  if (existing) existing.qty += amount;
  else inv.items.push({ key: itemDef.key, name: itemDef.name, emoji: itemDef.emoji, qty: amount });
  await inv.save({ session });
  return inv;
}

async function removeItemFromInventory(userId, itemKey, amount = 1, session = null) {
  const inv = await Inventory.findOne({ userId }).session(session);
  if (!inv) throw new Error('Inventory not found');
  const existing = inv.items.find(i => i.key === itemKey);
  if (!existing || existing.qty < amount) return false;
  existing.qty -= amount;
  if (existing.qty <= 0) inv.items = inv.items.filter(i => i.key !== itemKey);
  await inv.save({ session });
  return true;
}

/**
 * Atomically deduct coins and add item to inventory.
 * Returns { success: true, inventory } on success.
 * Returns { success: false, reason: 'insufficient' } if not enough coins.
 */
async function purchaseItemAtomic(userId, itemKey, qty = 1) {
  const itemDef = shopItems[itemKey];
  if (!itemDef) throw new Error('Invalid itemKey');

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const inv = await Inventory.findOne({ userId }).session(session);
    if (!inv) {
      await session.abortTransaction();
      session.endSession();
      throw new Error('Inventory not found');
    }

    const totalCost = itemDef.cost * qty;
    if (inv.coins < totalCost) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, reason: 'insufficient' };
    }

    inv.coins -= totalCost;
    const existing = inv.items.find(i => i.key === itemKey);
    if (existing) existing.qty += qty;
    else inv.items.push({ key: itemDef.key, name: itemDef.name, emoji: itemDef.emoji, qty });

    await inv.save({ session });
    await session.commitTransaction();
    session.endSession();
    return { success: true, inventory: inv };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = {
  ensureInventory,
  getItemDef,
  addItemToInventory,
  removeItemFromInventory,
  purchaseItemAtomic,
};

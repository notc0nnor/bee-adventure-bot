// scripts/fixInventoryKeys.js
const mongoose = require('mongoose');
const Inventory = require('../models/Inventory');
const shopItems = require('../models/shop');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const inventories = await Inventory.find();

  for (const inv of inventories) {
    let changed = false;

    for (const item of inv.items) {
      if (!item.key) {
        const match = Object.values(shopItems).find(
          it => it.name === item.name
        );
        if (match) {
          item.key = match.key;
          changed = true;
        }
      }
    }

    if (changed) {
      await inv.save();
      console.log(`Fixed inventory for user ${inv.userId}`);
    }
  }

  console.log('Done');
  process.exit(0);
})();

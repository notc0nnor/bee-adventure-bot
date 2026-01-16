const Inventory = require('../models/Inventory');
const shopItems = require('../models/shop');

async function migrateInventoryKeys() {
  const inventories = await Inventory.find({ 'items.key': { $exists: false } });

  if (!inventories.length) {
    console.log('✅ Inventory migration: no missing keys');
    return;
  }

  console.log(`🔧 Migrating ${inventories.length} inventories`);

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
      console.log(`✔ Fixed inventory for user ${inv.userId}`);
    }
  }
}

module.exports = migrateInventoryKeys;

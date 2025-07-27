require('dotenv').config();
const mongoose = require('mongoose');
const express = require("express");
const { Client, GatewayIntentBits } = require('discord.js');

// Create bot client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB!'))
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Express keep-alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server listening on port ${PORT}`);
});

// Bot ready event
client.once('ready', () => {
  console.log(`🐝 Logged in as ${client.user.tag}`);
});
// XP/EP level helper

const { getXpLevel, getEpLevel, getXpNeeded, getEpNeeded } = require('./levelUtils');

// ---!bee commands---
const Bee = require('./models/Bee');

client.on('messageCreate', async (message) => {
  // Ignore bots or non-commands
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  // Only allow admin to use this command
  const ADMIN_ID = '539820286787452938';
  if (command === '!bee') {
  const subcommand = args[1];

  // Admin: create
  if (subcommand === 'create') {
    if (message.author.id !== ADMIN_ID) {
      return message.reply('You don’t have permission to use this command.');
    }

    const beeId = args[2];
    const user = message.mentions.users.first();

    if (!beeId || !user) {
      return message.reply('Usage: `!bee create [ID] @user`');
    }

    const existing = await Bee.findOne({ beeId });
    if (existing) {
      return message.reply('A bee with that ID already exists.');
    }

    const newBee = new Bee({
      beeId,
      ownerId: user.id,
    });

    await newBee.save();
    return message.reply(`Created bee \`${beeId}\` for <@${user.id}>`);
  }

  // Admin: delete
  if (subcommand === 'delete') {
    if (message.author.id !== ADMIN_ID) {
      return message.reply('You don’t have permission to use this command.');
    }

    const beeId = args[2];
    if (!beeId) {
      return message.reply('Usage: `!bee delete [ID]`');
    }

    const deletedBee = await Bee.findOneAndDelete({ beeId });
    if (!deletedBee) {
      return message.reply(`No bee found with ID \`${beeId}\`.`);
    }

    return message.reply(`Bee \`${beeId}\` has been deleted.`);
  }

  // View specific bee
  if (subcommand) {
    const beeId = subcommand;
    const bee = await Bee.findOne({ beeId });
    if (!bee) return message.reply(`No bee found with ID \`${beeId}\``);

    const owner = await client.users.fetch(bee.ownerId);

const xpLevel = getXpLevel(bee.xp);
const xpNext = getXpNeeded(xpLevel + 1) - bee.xp;

const epLevel = getEpLevel(bee.ep);
const epNext = getEpNeeded(epLevel + 1) - bee.ep;

return message.reply({
  embeds: [{
    color: 0xffe419,
    title: `🐝 ID: ${bee.beeId}`,
    description: [
      `Owner: ${owner.tag}`,
      ``,
      `Level: ${xpLevel}`,
      `XP: ${bee.xp} (${xpNext} needed for Level ${xpLevel + 1})`,
      ``,
      `Level: ${epLevel}`,
      `EP: ${bee.ep} (${epNext} needed for Level ${epLevel + 1})`
    ].join('\n'),
    footer: { text: 'Apis Equinus' },
    timestamp: new Date(),
  }]
});

  }

  // List all bees for the user
  const bees = await Bee.find({ ownerId: message.author.id });
  if (!bees.length) return message.reply('You have no bees.');

  let list = bees.map(b => `• \`${b.beeId}\` (XP: ${b.xp}, EP: ${b.ep})`).join('\n');

  return message.reply(`🐝 Your Bees:\n${list}`);
}
// ---!add xp---
  if (command === '!add' && args[1] === 'xp') {
  if (message.author.id !== ADMIN_ID) {
    return message.reply('You do not have permission to use this command.');
  }

  const amount = parseInt(args[2]);
  const beeId = args[3];

  if (isNaN(amount) || !beeId) {
    return message.reply('Usage: `!add xp [amount] [beeId]`');
  }

  const bee = await Bee.findOne({ beeId });
  if (!bee) return message.reply(`No bee found with ID \`${beeId}\``);

  const prevXp = bee.xp;
  const prevLevel = getXpLevel(prevXp);

  // Add XP and save
  bee.xp += amount;
  await bee.save();

  const newLevel = getXpLevel(bee.xp);

  // Send stat change embed to log channel
  const trackChannel = await client.channels.fetch('1394792906849652977');
  trackChannel.send({
    embeds: [{
      title: 'Bee Stat Change',
      color: 0x8140d6,
      description: `Added: **${amount} XP**\nTo: \`${bee.beeId}\`\n\n**XP**: ${prevXp} → ${bee.xp}`,
      timestamp: new Date(),
    }]
  });

  // If leveled up, send level up embed
  if (newLevel > prevLevel) {
    trackChannel.send({
      content: `<@${bee.ownerId}>`,
      embeds: [{
        title: `Bee ${bee.beeId} has leveled up!`,
        color: 0xffe419,
        description: `Your bee \`${bee.beeId}\` leveled up in **XP**!\nLevel ${prevLevel} → Level ${newLevel}`,
        timestamp: new Date(),
      }]
    });
  }

  return message.reply(`Added ${amount} XP to bee \`${bee.beeId}\`.`);
}

//---!add ep---
  if (command === '!add' && args[1] === 'ep') {
  if (message.author.id !== ADMIN_ID) {
    return message.reply('You do not have permission to use this command.');
  }

  const amount = parseInt(args[2]);
  const beeId = args[3];

  if (isNaN(amount) || !beeId) {
    return message.reply('Usage: `!add ep [amount] [beeId]`');
  }

  const bee = await Bee.findOne({ beeId });
  if (!bee) return message.reply(`No bee found with ID \`${beeId}\``);

  const prevEp = bee.ep;
  const prevLevelInfo = getEpLevel(prevEp);

  // Update and save
  bee.ep += amount;
  await bee.save();

  const newLevelInfo = getEpLevel(bee.ep);

  const trackChannel = await client.channels.fetch('1394792906849652977');

  // Send regular EP update log
  trackChannel.send({
    embeds: [{
      title: 'Bee Stat Change',
      color: 0xfa50d8,
      description: `Added: **${amount} EP**\nTo: \`${bee.beeId}\`\n\n**EP**: ${prevEp} → ${bee.ep}`,
      timestamp: new Date(),
    }]
  });

  // Check for level up
  if (newLevelInfo.level > prevLevelInfo.level) {
    trackChannel.send({
      content: `<@${bee.ownerId}>`,
      embeds: [{
        title: `Bee ${bee.beeId} has leveled up!`,
        color: 0xffe419,
        description: `Your bee \`${bee.beeId}\` leveled up in **EP**!\nLevel: **${prevLevelInfo.name}** → **${newLevelInfo.name}**`,
        timestamp: new Date(),
      }]
    });
  }

  return message.reply(`Added ${amount} EP to bee \`${bee.beeId}\`.`);
}
//---!inventory 

  const Inventory = require('./models/Inventory');
if (command === '!inventory') {
  const userId = message.author.id;

  // Find or create the inventory
  let inventory = await Inventory.findOne({ userId });
  if (!inventory) {
    inventory = new Inventory({ userId });
    await inventory.save();
  }

  return message.reply({
    embeds: [{
      color: 0xffe419,
      title: `${message.author.username}'s Inventory 🐝`,
      fields: [
        { name: 'Coins', value: `${inventory.coins} 🪙`, inline: true },
        { name: 'Flowers', value: `${inventory.flowers} 🌸`, inline: true },
      ],
      footer: { text: 'Apis Equinus' },
      timestamp: new Date(),
    }]
  });
}
//---!add coins---
if (command === '!add' && args[1] === 'coins') {
  if (message.author.id !== ADMIN_ID) {
    return message.reply('You do not have permission to use this command.');
  }

  const amount = parseInt(args[2], 10);
  const user = message.mentions.users.first();

  if (isNaN(amount) || !user) {
    return message.reply('Usage: `!add coins [amount] @user`');
  }

  let inventory = await Inventory.findOne({ userId: user.id });
  if (!inventory) {
    inventory = new Inventory({ userId: user.id });
  }

  const previousCoins = inventory.coins;
  inventory.coins += amount;
  await inventory.save();

  message.reply(`Added ${amount} 🪙 to <@${user.id}>'s inventory.`);

  const inventoryLogChannel = await client.channels.fetch('1394414785130532976');
  inventoryLogChannel.send({
    embeds: [{
      color: 0x50d8fa,
      title: 'Inventory Change',
      description: [
        `**Added:** ${amount} 🪙`,
        `**To:** <@${user.id}>`,
        ``,
        `**Coins:** ${previousCoins} → ${inventory.coins}`
      ].join('\n'),
      timestamp: new Date(),
    }],
  });
}
//---!add flowers---
  if (command === '!add' && args[1] === 'flowers') {
  if (message.author.id !== ADMIN_ID) {
    return message.reply('You do not have permission to use this command.');
  }

  const amount = parseInt(args[2], 10);
  const user = message.mentions.users.first();

  if (isNaN(amount) || !user) {
    return message.reply('Usage: `!add flowers [amount] @user`');
  }

  let inventory = await Inventory.findOne({ userId: user.id });
  if (!inventory) {
    inventory = new Inventory({ userId: user.id });
  }

  const previousFlowers = inventory.flowers;
  inventory.flowers += amount;
  await inventory.save();

  message.reply(`Added ${amount} 🌸 to <@${user.id}>'s inventory.`);

  const inventoryLogChannel = await client.channels.fetch('1394414785130532976');
  inventoryLogChannel.send({
    embeds: [{
      color: 0x5050fa,
      title: 'Inventory Change',
      description: [
        `**Added:** ${amount} 🌸`,
        `**To:** <@${user.id}>`,
        ``,
        `**Flowers:** ${previousFlowers} → ${inventory.flowers}`
      ].join('\n'),
      timestamp: new Date(),
    }],
  });
}
// --!remove coins---
if (command === '!remove' && args[1] === 'coins') {
  if (message.author.id !== ADMIN_ID) {
    return message.reply('You do not have permission to use this command.');
  }

  const amount = parseInt(args[2], 10);
  const user = message.mentions.users.first();

  if (isNaN(amount) || !user) {
    return message.reply('Usage: `!remove coins [amount] @user`');
  }

  let inventory = await Inventory.findOne({ userId: user.id });
  if (!inventory) {
    return message.reply(`<@${user.id}> has no inventory.`);
  }

  const previousCoins = inventory.coins;

  if (amount > inventory.coins) {
    return message.reply(`<@${user.id}> doesn't have that many coins.`);
  }

  inventory.coins -= amount;
  await inventory.save();

  message.reply(`Removed ${amount} 🪙 from <@${user.id}>'s inventory.`);

  const inventoryLogChannel = await client.channels.fetch('1394414785130532976');
  inventoryLogChannel.send({
    embeds: [{
      color: 0xe81902,
      title: 'Inventory Change',
      description: [
        `**Removed:** ${amount} 🪙`,
        `**From:** <@${user.id}>`,
        ``,
        `**Coins:** ${previousCoins} → ${inventory.coins}`
      ].join('\n'),
      timestamp: new Date(),
    }],
  });
}
  
//---!remove flowers---
  if (command === '!remove' && args[1] === 'flowers') {
  if (message.author.id !== ADMIN_ID) {
    return message.reply('You do not have permission to use this command.');
  }

  const amount = parseInt(args[2], 10);
  const user = message.mentions.users.first();

  if (isNaN(amount) || !user) {
    return message.reply('Usage: `!remove flowers [amount] @user`');
  }

  let inventory = await Inventory.findOne({ userId: user.id });
  if (!inventory) {
    return message.reply(`<@${user.id}> has no inventory.`);
  }

  const previousFlowers = inventory.flowers;

  if (amount > inventory.flowers) {
    return message.reply(`<@${user.id}> doesn't have that many flowers.`);
  }

  inventory.flowers -= amount;
  await inventory.save();

  message.reply(`Removed ${amount} 🌸 from <@${user.id}>'s inventory.`);

  const inventoryLogChannel = await client.channels.fetch('1394414785130532976');
  inventoryLogChannel.send({
    embeds: [{
      color: 0xe88102,
      title: 'Inventory Change',
      description: [
        `**Removed:** ${amount} 🌸`,
        `**From:** <@${user.id}>`,
        ``,
        `**Flowers:** ${previousFlowers} → ${inventory.flowers}`
      ].join('\n'),
      timestamp: new Date(),
    }],
  });
}



});

// Log in bot
const TOKEN = process.env.DISCORD_TOKEN;
client.login(TOKEN);

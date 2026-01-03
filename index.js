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
client.once('clientReady', () => {
  console.log(`🐝 Logged in as ${client.user.tag}`);
});

// EP level helper

const { getLevel, getLevelThreshold } = require("./levelUtils");
const fs = require("fs");
const beeFacts = JSON.parse(fs.readFileSync("./beeFacts.json", "utf8"));

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  ComponentType,
} = require('discord.js');

const Bee = require('./models/Bee');

// ---!bee commands---

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

const levelInfo = getLevel(bee.ep);

const epLine = levelInfo.next
  ? `EP: ${bee.ep} / ${levelInfo.next}`
  : `EP: ${bee.ep} / MAX`;

return message.reply({
  embeds: [{
    color: 0xffe419,
    title: `🐝 ID: ${bee.beeId}`,
    description: [
      `Owner: ${owner.tag}`,
      ``,
      `Level: ${levelInfo.level} (${levelInfo.name})`,
      epLine
    ].join('\n'),
    footer: { text: 'Apis Equinus' },
    timestamp: new Date(),
  }]
});
  }

  // List all bees for the user
  const bees = await Bee.find({ ownerId: message.author.id });
  if (!bees.length) return message.reply('You have no bees.');

  let list = bees.map(b => {
  const lvl = getLevel(b.ep);
  return `• \`${b.beeId}\` (Level ${lvl.level} - ${lvl.name}, EP: ${b.ep})`;
}).join('\n');

  return message.reply(`🐝 Your Bees:\n${list}`);
}
// ---!add ep---
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
  const prevLevelInfo = getLevel(prevEp);

  // Add EP and save
  bee.ep += amount;
  await bee.save();

  const newLevelInfo = getLevel(bee.ep);

  const trackChannel = await client.channels.fetch('1394792906849652977');
  trackChannel.send({
    embeds: [{
      title: 'Bee Stat Change',
      color: 0x8140d6,
      description: `Added: **${amount} EP**\nTo: \`${bee.beeId}\`\n\n**EP**: ${prevEp} → ${bee.ep}`,
      timestamp: new Date(),
    }]
  });

  // If leveled up
  if (newLevelInfo.level > prevLevelInfo.level) {
    trackChannel.send({
      content: `<@${bee.ownerId}>`,
      embeds: [{
        title: `Bee ${bee.beeId} has leveled up!`,
        color: 0xffe419,
        description: `Your bee \`${bee.beeId}\` leveled up!\n**${prevLevelInfo.name}** → **${newLevelInfo.name}**`,
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

 // inside your existing !inventory handler, after you fetch/create `inventory`
const itemList = (inventory.items && inventory.items.length)
  ? inventory.items.map(it => `${it.emoji} ${it.name} × ${it.quantity ?? it.qty ?? 0}`).join('\n')
  : 'No items';

return message.reply({
  embeds: [{
    color: 0xffe419,
    title: `${message.author.username}'s Inventory 🐝`,
    fields: [
      { name: 'Coins', value: `${inventory.coins} 🪙`, inline: true },
      { name: 'Flowers', value: `${inventory.flowers} 🌸`, inline: true },
      { name: 'Items', value: itemList, inline: false },
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

  message.reply(`Added ${amount} 🪙 to ${user.username}'s inventory.`);

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

  message.reply(`Added ${amount} 🌸 to ${user.username}'s inventory.`);

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
    return message.reply(`${user.username} has no inventory.`);
  }

  const previousCoins = inventory.coins;

  if (amount > inventory.coins) {
    return message.reply(`${user.username} doesn't have that many coins.`);
  }

  inventory.coins -= amount;
  await inventory.save();

  message.reply(`Removed ${amount} 🪙 from ${user.username}'s inventory.`);

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
  
//---!give coins---
if (command === '!give' && args[1] === 'coins') {
  const amount = parseInt(args[2], 10);
  const target = message.mentions.users.first();

  if (isNaN(amount) || !target) {
    return message.reply('Usage: `!give coins [amount] @user`');
  }

  if (amount <= 0) {
    return message.reply('Please enter a positive number of coins to give.');
  }

  if (target.id === message.author.id) {
    return message.reply("You can't give coins to yourself!");
  }

  const senderId = message.author.id;
  const recipientId = target.id;

  let senderInv = await Inventory.findOne({ userId: senderId });
  if (!senderInv) senderInv = new Inventory({ userId: senderId });

  if (senderInv.coins < amount) {
    return message.reply("You don't have enough coins to give!");
  }

  let recipientInv = await Inventory.findOne({ userId: recipientId });
  if (!recipientInv) recipientInv = new Inventory({ userId: recipientId });

  const senderPrev = senderInv.coins;
  const recipientPrev = recipientInv.coins;

  // Perform transfer
  senderInv.coins -= amount;
  recipientInv.coins += amount;

  await senderInv.save();
  await recipientInv.save();

  // Confirm in chat
  await message.reply(`You gave **${amount}** 🪙 to ${target.username}.`);

  // Log transaction (same inventory log channel you use in !add)
  const inventoryLogChannel = await client.channels.fetch('1394414785130532976');
  inventoryLogChannel.send({
    embeds: [{
      color: 0xc9ff19,
      title: 'Inventory Change - Transfer',
      description: [
        `**Transfer:** ${amount} 🪙`,
        `**From:** <@${senderId}>`,
        `**To:** <@${recipientId}>`,
        ``,
        `**<@${senderId}>'s Coins:** ${senderPrev} → ${senderInv.coins}`,
        `**<@${recipientId}>'s Coins:** ${recipientPrev} → ${recipientInv.coins}`
      ].join('\n'),
      timestamp: new Date(),
    }],
  });
}

//---!give flowers---
if (command === '!give' && args[1] === 'flowers') {
  const amount = parseInt(args[2], 10);
  const target = message.mentions.users.first();

  if (isNaN(amount) || !target) {
    return message.reply('Usage: `!give flowers [amount] @user`');
  }

  if (amount <= 0) {
    return message.reply('Please enter a positive number of flowers to give.');
  }

  if (target.id === message.author.id) {
    return message.reply("You can't give flowers to yourself!");
  }

  const senderId = message.author.id;
  const recipientId = target.id;

  // Fetch or create inventories
  let senderInv = await Inventory.findOne({ userId: senderId });
  if (!senderInv) senderInv = new Inventory({ userId: senderId });

  if (senderInv.flowers < amount) {
    return message.reply("You don't have enough flowers to give!");
  }

  let recipientInv = await Inventory.findOne({ userId: recipientId });
  if (!recipientInv) recipientInv = new Inventory({ userId: recipientId });

  const senderPrev = senderInv.flowers;
  const recipientPrev = recipientInv.flowers;

  // Perform transfer
  senderInv.flowers -= amount;
  recipientInv.flowers += amount;

  await senderInv.save();
  await recipientInv.save();

  // Confirm in chat
  await message.reply(`You gave **${amount}** 🌸 to ${target.username}.`);

  // Log transaction
  const inventoryLogChannel = await client.channels.fetch('1394414785130532976');
  inventoryLogChannel.send({
    embeds: [{
      color: 0xca61ff,
      title: 'Inventory Change - Transfer',
      description: [
        `**Transfer:** ${amount} 🌸`,
        `**From:** <@${senderId}>`,
        `**To:** <@${recipientId}>`,
        ``,
        `**<@${senderId}>'s Flowers:** ${senderPrev} → ${senderInv.flowers}`,
        `**<@${recipientId}>'s Flowers:** ${recipientPrev} → ${recipientInv.flowers}`
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
    return message.reply(`${user.username} has no inventory.`);
  }

  const previousFlowers = inventory.flowers;

  if (amount > inventory.flowers) {
    return message.reply(`${user.username} doesn't have that many flowers.`);
  }

  inventory.flowers -= amount;
  await inventory.save();

  message.reply(`Removed ${amount} 🌸 from ${user.username}'s inventory.`);

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
  // --- !use command ---
if (command === '!use') {
  const itemArg = args[0];
  const beeId = args[1];

  if (!itemArg || !beeId) {
    return message.reply("Usage: `!use [item name] [bee ID]`");
  }

  // get the item definition from models/shop.js
  const { getItemDef, removeItemFromInventory } = require('./utils/shopHelpers');
  const Bee = require('./models/Bee');
  const shopItems = require('./models/shop');

  const itemDef = getItemDef(itemArg);
  if (!itemDef) {
    return message.reply("Error: That item doesn't exist.");
  }

  // fetch inventory
  const Inventory = require('./models/Inventory');
  const inventory = await Inventory.findOne({ userId: message.author.id });
  if (!inventory) {
    return message.reply("Error: You don't have an inventory yet.");
  }

  // check if the user owns the item
  const item = inventory.items.find(i => i.key === itemDef.key);
  if (!item || item.qty < 1) {
    return message.reply(`You don't have any ${itemDef.name} to use.`);
  }

  // fetch the bee
  const BeeModel = require('./models/Bee');
  const bee = await BeeModel.findOne({ beeId: beeId });
  if (!bee) {
    return message.reply(`Bee with ID **${beeId}** not found.`);
  }

  // verify ownership
  if (bee.ownerId !== message.author.id) {
    return message.reply("You don't own this bee.");
  }

  // apply EP
  const oldEp = bee.ep;
  const epGain = itemDef.ep;
  const newEp = oldEp + epGain;
  bee.ep = newEp;
  await bee.save();

  // remove the item from inventory
  await removeItemFromInventory(message.author.id, itemDef.key, 1);

  // success reply
  await message.reply(`You used ${itemDef.emoji} **${itemDef.name}** on bee **${beeId}**! (+${epGain} EP)`);

  // log to tracking channel
  const trackingChannel = await client.channels.fetch('1394792906849652977');
  trackingChannel.send({
    embeds: [{
      color: 0x50fa7b,
      title: 'Bee Stat Change',
      description: [
        `**${message.author.username}** used **${itemDef.name}** on **${bee.beeId}**`,
        ``,
        `**Added:** ${epGain} EP`,
        ``,
        `**EP:** ${oldEp} → ${newEp}`
      ].join('\n'),
      timestamp: new Date(),
    }],
  });
}

if (command === '!work') {
  const WORK_CHANNEL_ID = '1390013455305801748';
  const LOG_CHANNEL_ID = '1394414785130532976';

  if (message.channel.id !== WORK_CHANNEL_ID) {
    return message.reply('Please visit <#1390013455305801748> to work!');
  }

  const userId = message.author.id;
  const user = message.author;

  // Load or create inventory
  let inventory = await Inventory.findOne({ userId });
  if (!inventory) {
    inventory = new Inventory({ userId });
  }

  const reward = Math.floor(Math.random() * (37 - 17 + 1)) + 17;
  const previousCoins = inventory.coins;
  inventory.coins += reward;
 
  // 1% flower chance
  const foundFlower = Math.random() < 0.01; 
  const previousFlowers = inventory.flowers ?? 0;

  if (foundFlower) {
    inventory.flowers = (inventory.flowers ?? 0) + 1;
  }

  await inventory.save();

  // Random work messages
  const workMessages = [
    "You do some gardening and earn some coins from a grateful swarm of bees.🐝",
    "You find a mother duck frantically searching for her ducklings after playing hide and seek. You search around the terrain until you find them all. 🦆",
    "You randomly find some coins in front of your doorstep. Maybe it's from someone you helped out before...🦆",
    "Oh no! You see little ducklings get separated from their mother after a strong gust of winds blows them further downstream! After getting your clothes all wet, you manage to capture them all and return them safely. 🐥",
    "Some coins are left to you by a farmer after helping them on the field. 🌱",
    "You helped the local wildlife by sprinkling wildflower seeds. The little bees thank you for your hard work. 🌷",
    "Oh no! You caught a bear cub nose deep in a tub of honey! It thanks you sheepishly for cleaning it up with some coins. 🐻",
    "While wandering through the meadow, you stumble upon a hidden patch of wild berries. You gather some and find a few coins tucked beneath the leaves. 🍓",
    "You rescue a baby bird tangled in vines. After freeing it, you find a small pouch of coins waiting for you in the nest. 🐤",
    "After planting new blossoms in the garden, you notice a cluster of bees buzzing happily around you, leaving a few coins as a sweet reward. 🐝",
    "While walking through the quiet forest, you find a baby deer tangled in some vines, frightened and struggling. After freeing it, you notice a small pouch of coins where the deer had been resting. 🦌",
    "You spend the morning helping out at the local stable, mucking out the stalls and brushing the horses. The stable master rewards your hard work with a handful of coins. 🐴",
    "You lend a hand to a farmer by repairing a broken fence that kept his animals safe. As you hammer the last nail in place, the farmer approaches with a basket of fresh produce and some coins. 🔨",
    "You try to teach a squirrel to dance, but it just ends up throwing acorns at you. Somehow, you still end up with a handful of coins as a ‘thank you’... or maybe a bribe? 🌰",
    "You accidentally scare a family of ducks into a pond, then spend the next hour trying to convince them you’re not a monster. At least one duck waddles over and drops some coins at your feet — probably as a peace offering. 🦆",
    "You attempt to help a clumsy crow find its lost shiny objects but only manage to gather a pile of random junk: a button, a spoon, and… oh, wait, some coins! Score! 🥄",
    "You pick fresh vegetables from the garden and carry them to the market stall. The grateful vendor hands you some coins for your help. 🥬",
    "You feed the chickens, collect eggs, and tidy up the coop. The farmer smiles and slips some coins into your pocket for a job well done. 🥚",
    "You try to milk a stubborn cow, but it’s more interested in licking your face. Eventually, you get a bucket full of milk, and a handful of coins from the amused farmer. 🐄",
    "You attempt to herd sheep, but they seem to prefer playing follow-the-leader with you instead. At least the shepherd tosses you some coins for the entertainment. 🐑",
    "You try to train a chicken to fetch tools, but it just hops in circles. Your unusual method somehow earns you a few coins from the farmer. 🐓",
    "On the way to work, you spot a... unicorn?? Magically, a pouch of shimmering coins appear before your feet, and the unicorn... horse... winks at you before disappearing. 🦄"
  ];

  const randomMessage = workMessages[Math.floor(Math.random() * workMessages.length)];

  // Reply embed
   const resultDescription = [
    `${randomMessage}`,
    ``,
    `You earned **${reward} 🪙**`,
    foundFlower ? `Luck was on your side! You found 1 🌸` : null
  ].filter(Boolean).join('\n');

  const workEmbed = new EmbedBuilder()
    .setColor(0xffe419)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
    .setDescription(resultDescription);

  await message.reply({ embeds: [workEmbed] });

  // Log embed
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
  const logEmbed = new EmbedBuilder()
    .setColor(0x85ffc4)
    .setTitle('Inventory Change')
    .setDescription([
      `**Added:** ${reward} 🪙`,
      `**To:** <@${userId}>`,
      `**By:** Working`,
      ``,
      `**Previous:** ${previousCoins} → **Now:** ${inventory.coins}`
    ].join('\n'))
    .setTimestamp();
  

  logChannel.send({ embeds: [logEmbed] });
if (foundFlower) {
    const flowerEmbed = new EmbedBuilder()
      .setColor(0xffade8)
      .setTitle('Inventory Change')
      .setDescription([
        `**Added:** 1 🌸`,
        `**To:** <@${userId}>`,
        `**By:** Working`,
        ``,
        `**Previous:** ${previousFlowers} → **Now:** ${inventory.flowers}`
      ].join('\n'))
      .setTimestamp();

    await logChannel.send({ embeds: [flowerEmbed] });
  }
}


// --!shop--
if (message.content.startsWith('!shop')) {
  const userId = message.author.id;
  let inventory = await Inventory.findOne({ userId });
  if (!inventory) {
    inventory = new Inventory({ userId });
    await inventory.save();
  }

  // Define shop items
  const shopItems = [
    { name: 'Nectar', ep: 10, cost: 100, emoji: '<:nectar:1389740460620382288>' },
    { name: 'Honey', ep: 15, cost: 145, emoji: '<:Honey:1390088067947167885>' },
    { name: 'Bee Bread', ep: 20, cost: 180, emoji: '<:BeeBread:1390098834192863232>' },
    { name: 'Gelee Royale', ep: 35, cost: 200, emoji: '<:GeleeRoyale:1390091559302729889>' },
  ];

  const shopEmbed = new EmbedBuilder()
    .setColor(0xffe419)
    .setTitle('Item Shop')
    .setDescription('Purchase treats for your Bees to increase their EP!')
    .addFields(
      shopItems.map(item => ({
        name: `${item.name} ${item.emoji}`,
        value: `**${item.cost}** 🪙 — Gives **${item.ep} EP**`,
        inline: false
      }))
    )
    .setFooter({ text: 'Apis Equinus' })
    .setTimestamp();

  const row = new ActionRowBuilder();

  shopItems.forEach(item => {
    const canAfford = inventory.coins >= item.cost;
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`buy_${item.name.toLowerCase().replace(/\s+/g, '_')}`)
        .setLabel(`${item.name} (${item.cost} 🪙)`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canAfford)
    );
  });

  await message.reply({ embeds: [shopEmbed], components: [row] });
}
  
// --!fact--

const fs = require("fs");
const beeFacts = JSON.parse(fs.readFileSync("./beeFacts.json", "utf8"));

// Inside your messageCreate event
if (message.content === "!fact") {
  const randomFact = beeFacts[Math.floor(Math.random() * beeFacts.length)];

  const factEmbed = new EmbedBuilder()
    .setColor(0x8ef527)
    .setTitle("🐝 Fun Fact!")
    .setDescription(randomFact)
    .setFooter({ text: "Buzzz... the more you know!" });

  message.channel.send({ embeds: [factEmbed] });
}
  
// --!buzz--
if (message.content === "!buzz") {
  const beeGifs = [
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExMnZtZHg2ejFtZGE5bTg2MG81cmx2cjEzaXhhdnRuYnU1NnVlYWUwYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/THDBkIhJ42uqjXxXAs/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzlrdXVmY2tlcmtmOTBpeDE4anNnbGdvZjl3aTI2ZnQ5MHl4dDdsMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/osKmEJsZrrXUQW3V5a/giphy.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjgzYmlxaTZobjdqdjB5eHJ1a2V0c2wzajZja3MyOGllaGdvdmkxdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1NQ7m0gqsah1XS4vG1/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWNna2FleWVmMW94ajY1OTVhODI5bWhxZDB0NGo0MHhzejhxbHcyaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Su12DRycqCCOjwHJkE/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWNna2FleWVmMW94ajY1OTVhODI5bWhxZDB0NGo0MHhzejhxbHcyaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ZRQZHqdoG3Po41Skng/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YmJtcHZweWM0b2poYzhvMGI4bmxscDBoc3Jhd2toc3NwNWdwbndvdCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ggCcnhCAVdD8duVfrW/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzBiZHZiOGU3MzZmczN2ZTE0NGcxZnB0ZHQ2ZDU3dW5pYTVtN3RpMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/SWhoKfLvgsEp81mD1J/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzBiZHZiOGU3MzZmczN2ZTE0NGcxZnB0ZHQ2ZDU3dW5pYTVtN3RpMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/ASDjW6JScIK1GFBf44/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZzBiZHZiOGU3MzZmczN2ZTE0NGcxZnB0ZHQ2ZDU3dW5pYTVtN3RpMSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/WOkrdOZIrjGkVJly9e/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3N2RtY2dkdnphYnNseDVtODE4anhpZXFpM3F2b2pvdXVyb3AyeGs3aSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/JmU24tAcyGKzif3peO/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3YnZhdTdzajFkYmI2NTdxbTFsaXMzdDhxcHoxY3p0enAwNW5ic2JucCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/1TicrQxbm00Io/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdG50cHprNWUyNGRoM3A3cnpid2MxNGVkeHA1bHZjNmxkZW9uNnBrNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/kPoGh51vLKuypsfbmR/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazRmc2I5bmViOHI3NDZyemJqZDRjaHZzeW9kb2dvbnJ0a2tlazh4aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/H1AU4xUZClB91nl7lE/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExazRmc2I5bmViOHI3NDZyemJqZDRjaHZzeW9kb2dvbnJ0a2tlazh4aCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/6MDhe0f5PSAD1LQeiq/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OWV2OWloN2ppbTBsMmJidmx1ODJzYWVoOWZxYmwzdHozYWQ4OXB0eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/q0fsV57oAD56M/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWF5eXVreng1bDFseGp4N3JzMWlidmpwMmkwajI1bTQ5MjdpeDQyZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l4FGtoprq7U3UAgtW/giphy.gif",
"https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWF5eXVreng1bDFseGp4N3JzMWlidmpwMmkwajI1bTQ5MjdpeDQyZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3976DSQtA2Iml09q/giphy.gif",
"https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWF5eXVreng1bDFseGp4N3JzMWlidmpwMmkwajI1bTQ5MjdpeDQyZiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/14jhYTxVkaOBl6/giphy.gif",
"https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eHdjdnhscnZ5d2c3cHQ2YnlzbXF0bDNva2ZmaGxkYjlnMmxnOG54MCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/MdM6yOgUWBPQkTm2du/giphy.gif",
"https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3a2w5cjA0YjRtYmJkZW55OG9kYnVodGsyZTFyaHJtc3R5aDU5aTZ6aiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Y1etfkj6wlX7Y317yG/giphy.gif",
"https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3aGZqNXN0YjNzbnZ2eHc3bXJpbDdqZXI5aDZodjV2dDVnNThnaTRlcSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/odtdjZgbgDqMg/giphy.gif",
"https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3M2ZqZjZzeGxlZ3RxZ2UwODl0eGZ4aHVjNjRuanJ0ODluaThlanY3MCZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/3ohze39XQDWely1GTe/giphy.gif",
"https://tenor.com/view/bee-rizz-bee-eyebrow-bee-kiss-gif-13467304041985061911",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3OWV2OWloN2ppbTBsMmJidmx1ODJzYWVoOWZxYmwzdHozYWQ4OXB0eSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Bpbh7Xxubh3gW2PG8K/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eXkxajV4eGRyM3dqanY4Yjhmb3Fmb3BjMTljNGV0emhsc2p4MDVhZCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Upe3WPqlWutaFRyhgY/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eDkwNjJseHBsOW1yYWx5Mmc2b3Z0MGZvbGJ3dnV6d2xlOGd5ZXNidSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/l3fQ8wxtqxSH0PTJS/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3eDkwNjJseHBsOW1yYWx5Mmc2b3Z0MGZvbGJ3dnV6d2xlOGd5ZXNidSZlcD12MV9naWZzX3JlbGF0ZWQmY3Q9Zw/3owypow1DIRU6OgaHe/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2xhOGxvcndwb2pqMWl1MXBlbzFyNmZnODJoNngxcW1tbnB6cGJkbyZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l3976DSQtA2Iml09q/giphy.gif"
 ];

  const randomGif = beeGifs[Math.floor(Math.random() * beeGifs.length)];

  const gifEmbed = new EmbedBuilder()
    .setColor(0xfff538)
    .setImage(randomGif)
    .setFooter({ text: "Buzz buzz!" });

  message.channel.send({ embeds: [gifEmbed] });
}
});

 const Inventory = require('./models/Inventory');
const ITEMS_PER_PAGE = 10;

client.on("messageCreate", async (message) => {
  if (message.content === "!leaderboard") {
    let inventories = await Inventory.find().sort({ coins: -1 }).lean();

    if (!inventories.length) return message.channel.send("No data found.");

    // Find the user's rank
    const userRank = inventories.findIndex(inv => inv.userId === message.author.id) + 1;

    let page = 0;

    const generateEmbed = (page) => {
      const start = page * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const pageData = inventories.slice(start, end);

      const embed = new EmbedBuilder()
        .setColor(0xffc107)
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .setTitle(`🏆 Coin Leaderboard`)
        .setDescription(pageData.map((inv, i) => {
          const rank = start + i + 1;
          return `**#${rank}** <@${inv.userId}> — ${inv.coins} coins`;
        }).join("\n"))
        .setFooter({ text: `You are #${userRank}` });

      return embed;
    };

    // Initial embed
    const embedMessage = await message.channel.send({
      embeds: [generateEmbed(page)],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`prev_${message.id}`)
            .setLabel("⬅️ Prev")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId(`next_${message.id}`)
            .setLabel("Next ➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled((page + 1) * ITEMS_PER_PAGE >= inventories.length)
        )
      ]
    });

    // Button interaction collector
    const collector = embedMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000 // 5 minutes
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: "You can't control this leaderboard.", ephemeral: true });
      }

      if (i.customId === "next") page++;
      if (i.customId === "prev") page--;

      await i.update({
        embeds: [generateEmbed(page)],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("prev")
              .setLabel("Prev")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(page === 0),
            new ButtonBuilder()
              .setCustomId("next")
              .setLabel("Next")
              .setStyle(ButtonStyle.Primary)
              .setDisabled((page + 1) * ITEMS_PER_PAGE >= inventories.length)
          )
        ]
      });
    });

    collector.on("end", () => {
      embedMessage.edit({ components: [] }).catch(() => {});
    });
  }
});

// SHOP BUTTON HANDLER
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const customId = interaction.customId;

  // Only handle shop buttons
  if (!customId.startsWith('buy_')) return;

  const itemName = customId.replace('buy_', '').replace(/_/g, ' ');

  // Shop items (same list as in !shop)
  const shopItems = [
    { name: 'Nectar', ep: 10, cost: 100, emoji: '<:nectar:1389740460620382288>' },
    { name: 'Honey', ep: 15, cost: 145, emoji: '<:Honey:1390088067947167885>' },
    { name: 'Bee Bread', ep: 20, cost: 180, emoji: '<:BeeBread:1390098834192863232>' },
    { name: 'Gelee Royale', ep: 35, cost: 200, emoji: '<:GeleeRoyale:1390091559302729889>' },
  ];

  const item = shopItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
  if (!item) return interaction.reply({ content: 'Error: Item not found.' });

  // Fetch inventory
  let inventory = await Inventory.findOne({ userId });
  if (!inventory) {
    inventory = new Inventory({ userId });
    await inventory.save();
  }

  // Check balance
  if (inventory.coins < item.cost) {
    return interaction.reply({ content: `You don't have enough coins to buy **${item.name}** ${item.emoji}!`});
  }

  // Deduct cost
  inventory.coins -= item.cost;

  // Add item
  const existingItem = inventory.items.find(i => i.name === item.name);
  if (existingItem) {
    existingItem.quantity = (existingItem.quantity || 1) + 1;
  } else {
    inventory.items.push({ name: item.name, ep: item.ep, cost: item.cost, emoji: item.emoji, quantity: 1 });
  }

  await inventory.save();

  // Log purchase
const inventoryLogChannel = await client.channels.fetch('1394414785130532976');

const previousCoins = inventory.coins + item.cost; // coins before purchase

if (inventoryLogChannel) {
  inventoryLogChannel.send({
    embeds: [{
      color: 0x5050fa,
      title: 'Inventory Change',
      description: [
        `**Purchased:** ${item.emoji} ${item.name}`,
        `**From:** <@${interaction.user.id}>`,
        ``,
        `**Coins:** ${previousCoins} → ${inventory.coins}`
      ].join('\n'),
      timestamp: new Date(),
    }],
  });
}

  // Confirm to user
  await interaction.reply({
    content: `You purchased **${item.name}** ${item.emoji}  for **${item.cost}** 🪙!`,
  });
});


// Log in bot
const TOKEN = process.env.DISCORD_TOKEN;
client.login(TOKEN);

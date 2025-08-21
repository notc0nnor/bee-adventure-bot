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

// --!fact--

const fs = require("fs");
const beeFacts = JSON.parse(fs.readFileSync("./beeFacts.json", "utf8"));
  
const { EmbedBuilder } = require("discord.js");

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
            .setCustomId("prev")
            .setLabel("⬅️ Prev")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("Next ➡️")
            .setStyle(ButtonStyle.Primary)
            .setDisabled((page + 1) * ITEMS_PER_PAGE >= inventories.length)
        )
      ]
    });

    // Button interaction collector
    const collector = embedMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000 // 1 minute
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

// Log in bot
const TOKEN = process.env.DISCORD_TOKEN;
client.login(TOKEN);


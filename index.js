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


client.once('ready', async () => {

  const now = Date.now();
  const bees = await Bee.find({ status: 'adventuring' });

  for (const bee of bees) {
    const timeLeft = bee.adventureEndTime - now;

    if (timeLeft <= 0) {
      // Adventure already finished while bot was offline
      finishAdventure(bee);
    } else {
      // Set timeout to finish later
      setTimeout(() => finishAdventure(bee), timeLeft);
    }
  }
});


// XP/EP level helper

const { getXpLevel, getEpLevel, getXpNeeded, getEpNeeded } = require('./levelUtils');

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');

const Bee = require('./models/Bee');

//--- adventure restart check---
async function finishAdventure(bee, user) {
  const Inventory = require('./models/Inventory');
  const adventureDuration = bee.adventureEndTime - (Date.now() - 1000); // buffer

  let reward;
  if (adventureDuration <= 3600000) {
    reward = { xp: 5, coinMin: 7, coinMax: 15, flowerChance: 0.02, cooldown: 12 * 3600000 };
  } else if (adventureDuration <= 3 * 3600000) {
    reward = { xp: 12, coinMin: 12, coinMax: 30, flowerChance: 0.05, cooldown: 24 * 3600000 };
  } else {
    reward = { xp: 35, coinMin: 23, coinMax: 50, flowerChance: 0.07, cooldown: 48 * 3600000 };
  }

  const previousLevel = getXpLevel(bee.xp);
  const newLevel = getXpLevel(bee.xp + reward.xp);

  // Adjust rewards for level
  if (newLevel >= 5) reward.coinMin += 5, reward.coinMax += 5;
  if (newLevel >= 9) reward.flowerChance += 0.02;

  const coins = Math.floor(Math.random() * (reward.coinMax - reward.coinMin + 1)) + reward.coinMin;
  const foundFlower = Math.random() < reward.flowerChance;

  // Update bee and inventory
  bee.xp += reward.xp;
  bee.status = 'cooldown';
  bee.adventureEndTime = null;
  bee.cooldownEndTime = new Date(Date.now() + reward.cooldown);
  await bee.save();

  const inventory = await Inventory.findOneAndUpdate(
    { userId: bee.ownerId },
    { $inc: { coins, flowers: foundFlower ? 1 : 0 } },
    { upsert: true, new: true }
  );

  // Send results to user
  const userTag = `<@${bee.ownerId}>`;
  const channel = await client.channels.fetch(user.dmChannel?.id || user.lastMessage?.channelId);
  const embed = new EmbedBuilder()
    .setColor('#ffe419')
    .setTitle(`Bee ${bee.beeId} returns!`)
    .setDescription(`${userTag}, your bee has returned from its adventure!`)
    .addFields(
      { name: 'XP Earned', value: `${reward.xp} ✨`},
      { name: 'Coins Earned', value: `${coins} 🪙`},
      ...(foundFlower ? [{ name: 'Found a Flower', value: `🌸`}] : [])
    )
    .setTimestamp();

  if (channel) await channel.send({ embeds: [embed] });

  // Send level-up message
  if (newLevel > previousLevel) {
    const levelChannel = await client.channels.fetch('1394792906849652977');
    const levelEmbed = new EmbedBuilder()
      .setColor('#ffe419')
      .setTitle(`Bee ${bee.beeId} has leveled up!`)
      .setDescription(`Your bee ${bee.beeId} leveled up in XP! Level ${previousLevel} → Level ${newLevel}`)
      .setTimestamp();

    await levelChannel.send({ content: `<@${bee.ownerId}>`, embeds: [levelEmbed] });
  }
}


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

const xpLevel = getXpLevel(bee.xp);

const epLevel = getEpLevel(bee.ep);
    
return message.reply({
  embeds: [{
    color: 0xffe419,
    title: `🐝 ID: ${bee.beeId}`,
    description: [
      `Owner: ${owner.tag}`,
      ``,
      `Level: ${xpLevel}`,
      `XP: ${bee.xp}`,
      ``,
      `Level: ${epLevel}`,
      `EP: ${bee.ep}`
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
if (command === '!work') {
  const WORK_CHANNEL_ID = '1390013455305801748';
  const LOG_CHANNEL_ID = '1394414785130532976';

  if (message.channel.id !== WORK_CHANNEL_ID) {
    return message.reply('You can only use this command in the designated work channel.');
  }

  const userId = message.author.id;
  const user = message.author;

  // Load or create inventory
  let inventory = await Inventory.findOne({ userId });
  if (!inventory) {
    inventory = new Inventory({ userId });
  }

  const reward = Math.floor(Math.random() * (35 - 15 + 1)) + 15;
  const previousCoins = inventory.coins;
  inventory.coins += reward;
  await inventory.save();

  // Random work messages
  const workMessages = [
    "You do some gardening and earn some coins from a grateful swarm of bees.",
    "You find a mother duck frantically searching for her ducklings after playing hide and seek. You search around the terrain until you find them all.",
    "You randomly find some coins in front of your doorstep. Maybe it's from someone you helped out before...🦆",
    "Oh no! You see little ducklings get separated from their mother after a strong gust of winds blows them further downstream! After getting your clothes all wet, you manage to capture them all and return them safely.",
    "Some coins are left to you by a farmer after helping them on the field.",
    "You helped the local wildlife by sprinkling wildflower seeds. The little bees thank you for your hard work.",
    "Oh no! You caught a bear cub nose deep in a tub of honey! It thanks you sheepishly for cleaning it up with some coins."
  ];

  const randomMessage = workMessages[Math.floor(Math.random() * workMessages.length)];

  // Reply embed
  const workEmbed = new EmbedBuilder()
    .setColor(0xffe419)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
    .setDescription(`${randomMessage}\n\nYou earned **${reward} 🪙**`);

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
}
  
  //---!adventure---
 if (command === '!adventure') {
  const beeId = args[1];
  if (!beeId) return message.reply('Usage: `!adventure [Bee ID]`');

  const bee = await Bee.findOne({ beeId });
  if (!bee) return message.reply(`No bee found with ID \`${beeId}\``);

  if (bee.ownerId !== message.author.id) {
    return message.reply('That bee doesn’t belong to you!');
  }

  const now = new Date();

  if (bee.onAdventureUntil && bee.onAdventureUntil > now) {
    const returnTime = `<t:${Math.floor(bee.onAdventureUntil.getTime() / 1000)}:R>`;
    return message.reply(`That bee is still on an adventure! It will return ${returnTime}.`);
  }

  if (bee.cooldownUntil && bee.cooldownUntil > now) {
    const readyTime = `<t:${Math.floor(bee.cooldownUntil.getTime() / 1000)}:R>`;
    return message.reply(`That bee is resting after its last adventure. It will be ready ${readyTime}.`);
  }

  // Show adventure options
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`adventure_1h_${beeId}`).setLabel('1h').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`adventure_3h_${beeId}`).setLabel('3h').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`adventure_8h_${beeId}`).setLabel('8h').setStyle(ButtonStyle.Primary),
  );

  const embed = new EmbedBuilder()
    .setColor(0xffe419)
    .setTitle(`Adventure Time? 🌸 \`${beeId}\``)
    .setDescription([
      `How long should your Bee adventure for?`,
    ].join('\n'))
    .setFooter({ text: 'Apis Equinus' })
    .setTimestamp();

  return message.reply({ embeds: [embed], components: [row] });
}
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const [prefix, hours, beeId] = interaction.customId.split('_');
  if (prefix !== 'adventure') return;

  await interaction.deferReply();

  const bee = await Bee.findOne({ beeId });
  if (!bee) return interaction.followUp({ content: `No bee found with ID \`${beeId}\`` });

  if (bee.ownerId !== interaction.user.id) {
    return interaction.followUp({ content: 'That bee doesn’t belong to you!' });
  }

  const now = new Date();
  if (bee.onAdventureUntil && bee.onAdventureUntil > now) {
    const returnTime = `<t:${Math.floor(bee.onAdventureUntil.getTime() / 1000)}:R>`;
    return interaction.followUp({ content: `That bee is still on an adventure! It returns ${returnTime}.` });
  }

  if (bee.cooldownUntil && bee.cooldownUntil > now) {
    const readyTime = `<t:${Math.floor(bee.cooldownUntil.getTime() / 1000)}:R>`;
    return interaction.followUp({ content: `That bee is resting. It will be ready ${readyTime}.` });
  }

  // Adventure config
  const options = {
    '1h': { xp: 5, minCoins: 7, maxCoins: 15, flowerChance: 2, cooldownHours: 12 },
    '3h': { xp: 12, minCoins: 12, maxCoins: 30, flowerChance: 5, cooldownHours: 24 },
    '8h': { xp: 35, minCoins: 23, maxCoins: 50, flowerChance: 7, cooldownHours: 48 },
  };

  const config = options[hours];
  const level = getXpLevel(bee.xp);

  if (level >= 5) {
    config.minCoins += 5;
    config.maxCoins += 5;
  }
  if (level >= 9) {
    config.flowerChance += 2;
  }
  

  // Set timers

// Normalize and parse input like "1h30m", "2h", "45m", "2h 15m"
const timeString = hours.toLowerCase().replace(/\s+/g, ''); // remove spaces
const match = timeString.match(/(?:(\d+)h)?(?:(\d+)m)?/);

let totalMs = 0;
if (match) {
  const h = parseInt(match[1]) || 0;
  const m = parseInt(match[2]) || 0;
  totalMs = (h * 60 + m) * 60 * 1000;
}


// Convert "1h", "30m", etc. to minutes
let durationMinutes = 0;

if (hours.endsWith('h')) {
  durationMinutes = parseFloat(hours) * 60;
} else if (hours.endsWith('m')) {
  durationMinutes = parseFloat(hours);
} else {
  return message.reply('Invalid time format! Use `1h` or `30m`.');
}

// Make sure it's a valid number
if (isNaN(durationMinutes) || durationMinutes <= 0) {
  return message.reply('Invalid duration.');
}

// Final adventure duration in ms
const ms = durationMinutes * 60 * 1000;

// Set adventure status and timers
bee.status = 'adventuring';
bee.adventureEndTime = new Date(now.getTime() + ms);
bee.cooldownEndTime = new Date(now.getTime() + ms + config.cooldownMinutes * 60 * 1000);

await bee.save();


// Apply adventure and cooldown times
bee.adventureEndTime = new Date(now.getTime() + totalMs);
bee.cooldownEndTime = new Date(now.getTime() + totalMs + config.cooldownHours * 5 * 1000);
await bee.save();


  
  await interaction.editReply({
  content: `🐝 Bee \`${bee.beeId}\` is now on an adventure! They will return in ${hours}.`
});
  
try {
  const originalMsg = await interaction.message.fetch();
  await originalMsg.edit({ components: [] });
} catch (err) {
  console.warn('Could not remove buttons:', err);
}
  const ms = bee.adventureEndTime - Date.now();
  if (ms <= 0) {
  const user = await client.users.fetch(bee.ownerId);
  await finishAdventure(bee, user);
} else {
setTimeout(async () => {
  const user = await client.users.fetch(bee.ownerId);
  await finishAdventure(bee, user);
}, ms); // this should be 1h, 3h, or 8h in ms
  }
  
const adventureEnd = new Date(now.getTime() + config.duration * 60 * 1000); // change back time 60 60 1000
const cooldownEnd = new Date(now.getTime() + config.cooldown * 5 * 1000); //change back time 60 60 1000

bee.status = 'adventuring';
bee.adventureEndTime = adventureEnd;
bee.cooldownEndTime = cooldownEnd;
await bee.save();

  // Schedule result
  setTimeout(async () => {
    const Inventory = require('./models/Inventory');
    const user = await client.users.fetch(bee.ownerId);
    let inventory = await Inventory.findOne({ userId: user.id });
    if (!inventory) {
      inventory = new Inventory({ userId: user.id });
    }

    const coinReward = Math.floor(Math.random() * (config.maxCoins - config.minCoins + 1)) + config.minCoins;
    const flowerFound = Math.random() * 100 < config.flowerChance;

    inventory.coins += coinReward;
    if (flowerFound) inventory.flowers += 1;
    await inventory.save();
    bee.xp += config.xp;
    const prevLevel = getXpLevel(bee.xp - config.xp);
const newLevel = getXpLevel(bee.xp);

if (newLevel > prevLevel) {
  const levelUpChannel = await client.channels.fetch('1394792906849652977');
  await levelUpChannel.send({
    content: `<@${bee.ownerId}>`,
    embeds: [
      new EmbedBuilder()
        .setColor(0xffe419)
        .setTitle(`Bee ${bee.beeId} has leveled up!`)
        .setDescription(`Your bee \`${bee.beeId}\` leveled up in **XP**!\nLevel ${prevLevel} → Level ${newLevel}`)
        .setTimestamp()
    ]
  });
}
    await bee.save();

    bee.onAdventureUntil = null;
    await bee.save();

    const messages = [
      "Your bee returned with muddy wings but a proud buzz.",
      "The journey was long, but fruitful!",
      "Your bee faced many perils… and brought back loot.",
      "The bee flew far and wide, and has returned safely.",
      "A happy hum echoes — your bee is back!",
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];

    const resultEmbed = new EmbedBuilder()
      .setColor(0xffe419)
      .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
      .setTitle( `Bee ${bee.beeId} returns!` )
      .setDescription([
      `${randomMsg}`,
      ``,
      `Earned: **${config.xp} XP**`,
      `Collected: **${coinReward} 🪙**`,
      flowerFound ? `Also found: **1 🌸**` : `No flowers found this time.`,
     ].join('\n'))
      .setFooter({ text: `Adventure complete for bee ${bee.beeId}` })
      .setTimestamp();

    const channel = await client.channels.fetch(interaction.channelId);
    await channel.send({ content: `<@${user.id}>`, embeds: [resultEmbed] });

  }, ms);
});


// Log in bot
const TOKEN = process.env.DISCORD_TOKEN;
client.login(TOKEN);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const Bee = require('./models/Bee');
  const bees = await Bee.find({ status: 'adventuring' });

  for (const bee of bees) {
    const timeLeft = bee.adventureEndTime - Date.now();
    const user = await client.users.fetch(bee.ownerId);

    if (timeLeft <= 0) {
      finishAdventure(bee, user); // adventure already ended while bot was offline
    } else {
      setTimeout(() => finishAdventure(bee, user), timeLeft); // set up to finish later
    }
  }
});

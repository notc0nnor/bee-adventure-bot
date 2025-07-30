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
const ADVENTURE_CHANNEL_ID = '1393923129008586753';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
} = require('discord.js');


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
//---!work command---
  if (command === 'work') { 
  if (message.channel.id !== '1390013455305801748') {
    return message.reply('Please visit <#1390013455305801748> to work.');
  }

  const userId = message.author.id;
  const user = message.author;

  const reward = Math.floor(Math.random() * (35 - 15 + 1)) + 15;
  const descriptions = [
    "You do some gardening and earn some coins from a grateful swarm of bees.",
    "You find a mother duck frantically searching for her ducklings after playing hide and seek. You search around the terrain until you find them all.",
    "You randomly find some coins in front of your doorstep. Maybe it's from someone you helped out before...🦆",
    "Oh no! You see little ducklings get separated from their mother after a strong gust of winds blows them further downstream! After getting your clothes all wet, you manage to capture them all and return them safely.",
    "Some coins are left to you by a farmer after helping them on the field.",
    "You helped the local wildlife by sprinkling wildflower seeds. The little bees thank you for your hard work.",
    "Oh no! You caught a bear cub nose deep in a tub of honey! It thanks you sheepishly for cleaning it up with some coins."
  ];
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];

  // Load or create inventory
 let inventory = await Inventory.findOne({ userId: message.author.id });
  if (!inventory) {
    return message.reply('You do not have an inventory yet.');
  }

  const previousCoins = inventory.coins;
  inventory.coins += reward;
  await inventory.save();

  // User embed
  const embed = new EmbedBuilder()
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
    .setDescription(`${description}\n\nYou earned ${reward} 🪙`)
    .setColor('#85ffc4');

  await message.reply({ embeds: [embed] });

  // Logging embed
const inventoryLogChannel = await client.channels.fetch('1394414785130532976'); // your actual logging channel
if (inventoryLogChannel && inventoryLogChannel.isTextBased()) {
  inventoryLogChannel.send({
    embeds: [{
      color: 0x85ffc4,
      title: 'Inventory Change',
      description: [
        `**Added:** ${reward} 🪙`,
        `**To:** <@${user.id}>`,
        ``,
        `**Coins:** ${inventory.coins - reward} → ${inventory.coins}`
      ].join('\n'),
      timestamp: new Date(),
    }],
  });
}
}

// --- !adventure [ID] command ---
if (command === '!adventure') {
  // Check correct channel
  if (message.channel.id !== ADVENTURE_CHANNEL_ID) {
    return message.reply('Please visit <#1393923129008586753> to adventure!');
  }

  const beeId = args[1];
  if (!beeId) return message.reply('You must specify an ID: `!adventure [ID]`');

  const bee = await Bee.findOne({ beeId });
  if (!bee) return message.reply(`No bee found with ID \`${beeId}\``);
  if (bee.ownerId !== message.author.id) {
    return message.reply('You do not own this bee.');
  }
  
// Cleanup expired cooldowns
if (bee.adventureCooldown && new Date() >= bee.adventureCooldown) {
  bee.adventureCooldown = null;
  await bee.save();
}

  // Cooldown check
  if (bee.adventureCooldown && bee.adventureCooldown > new Date()) {
    const remainingMs = bee.adventureCooldown - new Date();
    const minutes = Math.floor((remainingMs / 1000 / 60) % 60);
    const hours = Math.floor((remainingMs / 1000 / 60 / 60));

    return message.reply(
      `This bee is resting! They will be ready in **${hours}h ${minutes}m**.`
    );
  }

  // Optional: Prevent duplicate messages
  if (bee.adventure?.startedAt && !bee.adventure.endsAt) {
    return message.reply('This bee is already preparing for an adventure.');
  }

  // Mark that the user is preparing an adventure
  bee.adventure = {
    startedAt: new Date(),
    type: null,
    endsAt: null,
  };
  await bee.save();

  // Create embed
  const embed = new EmbedBuilder()
    .setColor(0xffe419)
    .setTitle(`Adventure Time? 🌸 \`${beeId}\``)
    .setDescription('How long does your Bee want to adventure for?');

  // Create buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`adventure_1h_${beeId}`)
      .setLabel('1h')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`adventure_3h_${beeId}`)
      .setLabel('3h')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`adventure_8h_${beeId}`)
      .setLabel('8h')
      .setStyle(ButtonStyle.Primary),
  );

  // Send the embed with buttons
  await message.reply({ embeds: [embed], components: [row] });
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const customId = interaction.customId;
  const match = customId.match(/^adventure_(1h|3h|8h)_(.+)$/);
  if (!match) return;

  const [, durationKey, beeId] = match;
  const bee = await Bee.findOne({ beeId });
  if (!bee) return interaction.reply({ content: 'Bee not found.', ephemeral: true });
  if (bee.ownerId !== interaction.user.id) {
    return interaction.reply({ content: 'You do not own this bee.', ephemeral: true });
  }

  const durations = {
    '1h': { ms: 1 * 60 * 1000, xp: 5, coins: [7, 15], flowerChance: 0.02, cooldown: 1 * 60 * 1000 },
    '3h': { ms: 3 * 60 * 60 * 1000, xp: 12, coins: [12, 30], flowerChance: 0.05, cooldown: 24 * 60 * 60 * 1000 },
    '8h': { ms: 8 * 60 * 60 * 1000, xp: 35, coins: [23, 50], flowerChance: 0.07, cooldown: 48 * 60 * 60 * 1000 },
  };

  const selected = durations[durationKey];
  const endTime = new Date(Date.now() + selected.ms);

  bee.adventure = {
    startedAt: new Date(),
    endsAt: endTime,
    type: durationKey,
  };
  await bee.save();

  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  embed.setDescription(`Bee \`${beeId}\` started a ${durationKey} adventure! 🐝`);

  await interaction.update({
    embeds: [embed],
    components: [],
  });

  setTimeout(async () => {
    try {
      const updatedBee = await Bee.findOne({ beeId });
      if (!updatedBee) return;

      const xpGained = selected.xp;
      const coinsGained = Math.floor(Math.random() * (selected.coins[1] - selected.coins[0] + 1)) + selected.coins[0];
      const foundFlower = Math.random() < selected.flowerChance;

      const oldXp = updatedBee.xp;
      const previousLevel = getXpLevel(oldXp);
      updatedBee.xp += xpGained;
      const newLevel = getXpLevel(updatedBee.xp);

      if (newLevel > previousLevel) {
        const user = await client.users.fetch(updatedBee.ownerId);
        const adventureChannel = await client.channels.fetch(ADVENTURE_CHANNEL_ID);
        await adventureChannel.send({
          content: `<@${updatedBee.ownerId}>`,
          embeds: [{
            color: 0xffe419,
            title: `Bee \`${beeId}\` leveled up!`,
            description: `Your bee \`${updatedBee.beeId}\` leveled up!
Level ${previousLevel} → Level ${newLevel}`,
            timestamp: new Date(),
          }]
        });
      }

      const inv = await Inventory.findOneAndUpdate(
        { userId: updatedBee.ownerId },
        { $inc: { coins: coinsGained, flowers: foundFlower ? 1 : 0 } },
        { upsert: true, new: true }
      );

      const messages = [
        'Your bee returned from a sunny meadow.',
        'The bee found a cozy forest glade.',
        'An old flower patch was rediscovered!',
        'The journey was peaceful and scenic.',
        'A light rain didn’t stop your bee.',
        'A curious squirrel waved hello.',
        'Your bee made some buzzing friends!',
        'A lucky gust carried them far!',
        'They returned with pollen in their fur!',
      ];
      const result = messages[Math.floor(Math.random() * messages.length)];

      const adventureChannel = await client.channels.fetch(ADVENTURE_CHANNEL_ID);
      await adventureChannel.send({
        content: `<@${updatedBee.ownerId}>`,
        embeds: [{
          color: 0xffe419,
          title: `🐝 \`${beeId}\` has returned!`,
          description: `${result}

XP gained: ${xpGained}
Coins: ${coinsGained} 🪙
${foundFlower ? 'Flower: 1 🌸 ' : 'Flower: No flowers were found'}`,
          timestamp: new Date(),
        }]
      });

      const trackChannel = await client.channels.fetch('1394792906849652977');
      await trackChannel.send({
        embeds: [{
          color: 0xc6ff85,
          title: `Bee Stat Change`,
          description: `Added: ${xpGained} XP
To: \`${beeId}\`
By: Adventuring
Previous: ${updatedBee.xp - xpGained} → Now: ${updatedBee.xp}`,
          timestamp: new Date(),
        }]
      });

      const logChannel = await client.channels.fetch('1394414785130532976');
      await logChannel.send({
        embeds: [{
          color: 0xffe419,
          title: `Inventory Change`,
          description: `Added: ${coinsGained} 🪙
To: <@${updatedBee.ownerId}>
By: Adventuring
Previous: ${inv.coins - coinsGained} → Now: ${inv.coins}`,
          timestamp: new Date(),
        }]
      });

      if (foundFlower) {
        await logChannel.send({
          embeds: [{
            color: 0xf77cbc,
            title: `Inventory Change`,
            description: `Added: 1 🌸 
To: <@${updatedBee.ownerId}>
By: Adventuring
Previous: ${inv.flowers - 1} → Now: ${inv.flowers}`,
            timestamp: new Date(),
          }]
        });
      }

      updatedBee.adventureCooldown = new Date(Date.now() + selected.cooldown);
      updatedBee.adventure = null;
      await updatedBee.save();
    } catch (err) {
      console.error('Adventure timer error:', err);
    }
  }, selected.ms);
});

});

// Log in bot
const TOKEN = process.env.DISCORD_TOKEN;
client.login(TOKEN);


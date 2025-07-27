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

// ---!bee create command---
const Bee = require('./models/Bee');

client.on('messageCreate', async (message) => {
  // Ignore bots or non-commands
  if (message.author.bot || !message.content.startsWith('!')) return;

  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  // Only allow admin to use this command
  const ADMIN_ID = '539820286787452938';
  if (command === '!bee' && args[1] === 'create') {
    if (message.author.id !== ADMIN_ID) {
      return message.reply('You dont have permission to use this command.');
    }

    const beeId = args[2];
    const user = message.mentions.users.first();

    if (!beeId || !user) {
      return message.reply('Usage: `!bee create [ID] @user`');
    }

    // Check if the bee ID already exists
    const existing = await Bee.findOne({ beeId });
    if (existing) {
      return message.reply('A bee with that ID already exists.');
    }

    // Create the new bee
    const newBee = new Bee({
      beeId,
      ownerId: user.id,
    });

    await newBee.save();
    message.reply(`Created bee \`${beeId}\` for <@${user.id}>`);
  }

  // New: show bee info or list of bees for user
  if (command === '!bee') {
    // If an ID is provided, show that bee
    if (args[1]) {
      const beeId = args[1];
      const bee = await Bee.findOne({ beeId });
      if (!bee) return message.reply(`No bee found with ID \`${beeId}\``);

      const owner = await client.users.fetch(bee.ownerId);

      return message.reply({
        embeds: [{
          color: 0xffe419,
          title: `Bee ID: ${bee.beeId}`,
          description: `Owner: ${owner.tag}\nXP: ${bee.xp}\nEP: ${bee.ep}`,
          footer: { text: 'Apis Equinus Bot' },
          timestamp: new Date(),
        }]
      });
    }

    // If no ID provided, list all bees for message author
    const bees = await Bee.find({ ownerId: message.author.id });
    if (!bees.length) return message.reply('You have no bees.');

    let list = bees.map(b => `• \`${b.beeId}\` (XP: ${b.xp}, EP: ${b.ep})`).join('\n');

    return message.reply(`🐝 Your Bees:\n${list}`);
  }
});


// Log in bot
const TOKEN = process.env.DISCORD_TOKEN;
client.login(TOKEN);

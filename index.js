const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(PORT, () => {
  console.log(`🌐 Keep-alive server listening on port ${PORT}`);
});

const fs = require("fs");
const path = "./adventureData.json";

function loadAdventureData() {
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path));
  }
  return {};
}

function saveAdventureData() {
  fs.writeFileSync(path, JSON.stringify(adventureData, null, 2));
}
const beeDataPath = "./beeData.json";

function loadBeeData() {
  if (!fs.existsSync(beeDataPath)) fs.writeFileSync(beeDataPath, "{}");
  return JSON.parse(fs.readFileSync(beeDataPath));
}

function saveBeeData(data) {
  fs.writeFileSync(beeDataPath, JSON.stringify(data, null, 2));
}

const {
  Client,
  GatewayIntentBits,
  Partials,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder,
} = require("discord.js");
// Channel IDs
const LOG_CHANNEL_ID = "1394414785130532976";       // Logging channel (for add/remove)
const TRACKING_CHANNEL_ID = "1394792906849652977";  // Tracking channel (for level-up)

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

const TOKEN = process.env.DISCORD_TOKEN;
let adventureData = loadAdventureData();

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push("less than a minute");
  return parts.join(" ");
}
// XP and EP level thresholds
const xpLevels = [0, 50, 135, 255, 420, 600, 850, 1200, 1600, 1950, 2500];
const epLevels = [0, 50, 125, 225, 350, 500];

// Function to get XP level based on current XP
function getXpLevel(xp) {
  let level = 0;
  for (let i = 0; i < xpLevels.length; i++) {
    if (xp >= xpLevels[i]) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}

// Function to get EP level based on current EP
function getEpLevel(ep) {
  let level = 0;
  for (let i = 0; i < epLevels.length; i++) {
    if (ep >= epLevels[i]) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}


client.once("ready", () => {
  console.log(`🐝 Logged in as ${client.user.tag}`);
});
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();
  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();
  const userId = message.author.id;
  const now = Date.now();

  // --- !adventure command ---
if (command === "!adventure") {
  const beeId = args[1];
  if (!beeId) return message.reply("Please specify your Bee ID. Usage: `!adventure [BeeID]`");

  const beeData = loadBeeData();
  const bee = beeData[beeId];

  if (!bee) return message.reply("No bee with that ID was found.");
  if (bee.owner !== userId) return message.reply("You don't own this bee.");

  if (bee.endsAt && now < bee.endsAt) {
    const timeLeft = formatTime(bee.endsAt - now);
    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle("Ongoing Adventure")
      .setDescription(`Your Bee is still on an adventure! They will return in **${timeLeft}** 🌷`);
    return message.reply({ embeds: [embed] });
  }

  if (bee.cooldownUntil && now < bee.cooldownUntil) {
    const cooldownLeft = formatTime(bee.cooldownUntil - now);
    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle("Resting Bee.🐝")
      .setDescription(`Your Bee is tired after their adventure, they need to rest now. 🌼 They will be ready again in **${cooldownLeft}**.`);
    return message.reply({ embeds: [embed] });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`adventure_${beeId}_1h`).setLabel("1h").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`adventure_${beeId}_3h`).setLabel("3h").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`adventure_${beeId}_8h`).setLabel("8h").setStyle(ButtonStyle.Primary),
  );

  const embed = new EmbedBuilder()
    .setColor("#ffe712")
    .setTitle(`Adventure Time for Bee ${beeId}!`)
    .setDescription("How long does your Bee want to go on an adventure for? 🌸");

  return message.reply({ embeds: [embed], components: [row] });
}

  // --- !inventory command ---
  if (command === "!inventory") {
    let user = message.mentions.users.first() || message.author;
    let data = adventureData[user.id];

    if (!data || !data.inventory) {
      return message.reply(`${user.username} doesn't have an inventory yet.`);
    }

    const coins = data.inventory.coins ?? 0;
    const flowers = data.inventory.flowers ?? 0;

    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle(`${user.username}'s Inventory 🐝`)
      .setDescription(`**Coins:** ${coins} 🪙\n**Flowers:** ${flowers} 🌸`);

    return message.reply({ embeds: [embed] });
  }
if (command === "!bee" && args[1] === "create") {
  // Only you (Grace) can use this
  if (message.author.id !== "539820286787452938") {
    return message.reply("You can't do that.");
  }

  const beeId = args[2];
  const targetUser = message.mentions.users.first();

  if (!beeId || !targetUser) {
    return message.reply("Usage: !bee create [ID] @user");
  }

  const beeData = loadBeeData();
  if (beeData[beeId]) {
    return message.reply("A bee with that ID already exists.");
  }

  beeData[beeId] = {
    owner: targetUser.id,
    xp: 0,
    ep: 0,
    cooldownUntil: 0,
    endsAt: 0
  };

  saveBeeData(beeData);

  return message.reply(`Bee ${beeId} created for ${targetUser.username}.`);
}
if (command === "!bee") {
  const beeData = loadBeeData();

  // If user typed only "!bee"
  if (args.length === 1) {
    const userBees = Object.entries(beeData).filter(([id, data]) => data.owner === userId);

    if (userBees.length === 0) {
      return message.reply("You don't have any bees!");
    }

    for (const [id, data] of userBees) {
      const xpLevel = getXpLevel(data.xp);
      const epLevel = getEpLevel(data.ep);
      const nextXp = xpLevels[xpLevel + 1] ?? "Max";
      const nextEp = epLevels[epLevel + 1] ?? "Max";

      const embed = new EmbedBuilder()
        .setColor("#ffe712")
        .setTitle(`Bee ID: ${id}`)
        .setDescription(
          `XP: ${data.xp}/${nextXp} → ${nextXp === "Max" ? "Max" : nextXp - data.xp} to next level\n` +
          `EP: ${data.ep}/${nextEp} → ${nextEp === "Max" ? "Max" : nextEp - data.ep} to next level`
        );

      await message.channel.send({ embeds: [embed] });
    }

    return;
  }

  // If user typed "!bee [ID]"
  const beeId = args[1];
  const data = beeData[beeId];

  if (!data) {
    return message.reply("No bee with that ID was found.");
  }

  const xpLevel = getXpLevel(data.xp);
  const epLevel = getEpLevel(data.ep);
  const nextXp = xpLevels[xpLevel + 1] ?? "Max";
  const nextEp = epLevels[epLevel + 1] ?? "Max";

  const embed = new EmbedBuilder()
    .setColor("#ffe712")
    .setTitle(`Bee ID: ${beeId}`)
    .setDescription(
      `XP: ${data.xp}/${nextXp} → ${nextXp === "Max" ? "Max" : nextXp - data.xp} to next level\n` +
      `EP: ${data.ep}/${nextEp} → ${nextEp === "Max" ? "Max" : nextEp - data.ep} to next level\n` +
      `Owned by: <@${data.owner}>`
    );

  return message.channel.send({ embeds: [embed] });
}
// --- !add command ---
if (command === "!add") {
  if (message.author.id !== "539820286787452938") {
    return message.reply("You can't do that.");
  }

  if (args.length < 4 || !["coins", "flowers", "xp", "ep"].includes(args[1])) {
    return message.reply("Usage: `!add coins|flowers|xp|ep amount [@user|BeeID]`");
  }

  const type = args[1];
  const amount = parseInt(args[2]);
  if (isNaN(amount) || amount <= 0) {
    return message.reply("Please provide a valid positive number for the amount.");
  }

 const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

  if (type === "xp" || type === "ep") {
    const beeId = args[3];
    if (!beeId) {
      return message.reply("You must specify the Bee ID when adding XP or EP.");
    }

    const beeData = loadBeeData();
    const bee = beeData[beeId];
    if (!bee) {
      return message.reply("No bee found with that ID.");
    }

    const before = bee[type] || 0;
    bee[type] += amount;
    saveBeeData(beeData);

    await message.reply(`Added ${amount} ${type.toUpperCase()} to Bee ${beeId}.`);

    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor("#32CD32")
        .setTitle("Bee Stat Change")
        .setDescription(
          `**Added:** ${amount} ${type.toUpperCase()}\n` +
          `**To Bee:** ${beeId}\n` +
          `**By:** ${message.author.tag} (<@${message.author.id}>)\n` +
          `**Previous:** ${before} → **Now:** ${bee[type]}`
        )
        .setTimestamp();

      logChannel.send({ embeds: [logEmbed] });
    }

  } else {
    // coins or flowers
    const target = message.mentions.users.first() || message.author;
   adventureData = loadAdventureData();

    if (!adventureData[target.id]) {
      adventureData[target.id] = { inventory: { coins: 0, flowers: 0 } };
    } else if (!adventureData[target.id].inventory) {
      adventureData[target.id].inventory = { coins: 0, flowers: 0 };
    }

    const before = adventureData[target.id].inventory[type] || 0;
    adventureData[target.id].inventory[type] += amount;
    saveAdventureData(adventureData);

    await message.reply(`Added ${amount} ${type} to ${target.username}'s inventory.`);

    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor("#32CD32")
        .setTitle("Inventory Change")
        .setDescription(
          `**Added:** ${amount} ${type}\n` +
          `**To:** ${target.tag} (<@${target.id}>)\n` +
          `**By:** ${message.author.tag} (<@${message.author.id}>)\n` +
          `**Previous:** ${before} → **Now:** ${adventureData[target.id].inventory[type]}`
        )
        .setTimestamp();

      logChannel.send({ embeds: [logEmbed] });
    }
  }
}

// --- !remove command ---
if (command === "!remove") {
  if (message.author.id !== "539820286787452938") {
    return message.reply("You can't do that.");
  }

  if (args.length < 4 || !["coins", "flowers", "xp", "ep"].includes(args[1])) {
    return message.reply("Usage: `!remove coins|flowers|xp|ep amount [@user|BeeID]`");
  }

  const type = args[1];
  const amount = parseInt(args[2]);
  if (isNaN(amount) || amount <= 0) {
    return message.reply("Please provide a valid positive number for the amount.");
  }

const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

  if (type === "xp" || type === "ep") {
    const beeId = args[3];
    if (!beeId) {
      return message.reply("You must specify the Bee ID when removing XP or EP.");
    }

    const beeData = loadBeeData();
    const bee = beeData[beeId];
    if (!bee) {
      return message.reply("No bee found with that ID.");
    }

    const before = bee[type] || 0;
    bee[type] = Math.max(0, before - amount);
    saveBeeData(beeData);

    await message.reply(`Removed ${amount} ${type.toUpperCase()} from Bee ${beeId}.`);

    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor("#ff6347")
        .setTitle("Bee Stat Change")
        .setDescription(
          `**Removed:** ${amount} ${type.toUpperCase()}\n` +
          `**From Bee:** ${beeId}\n` +
          `**By:** ${message.author.tag} (<@${message.author.id}>)\n` +
          `**Previous:** ${before} → **Now:** ${bee[type]}`
        )
        .setTimestamp();

      logChannel.send({ embeds: [logEmbed] });
    }

  } else {
    const target = message.mentions.users.first() || message.author;
    adventureData = loadAdventureData();

    if (!adventureData[target.id] || !adventureData[target.id].inventory) {
      return message.reply(`${target.username} has no inventory.`);
    }

    const before = adventureData[target.id].inventory[type] || 0;
    adventureData[target.id].inventory[type] = Math.max(0, before - amount);
    saveAdventureData(adventureData);

    await message.reply(`Removed ${amount} ${type} from ${target.username}'s inventory.`);

    if (logChannel && logChannel.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setColor("#ff6347")
        .setTitle("Inventory Change")
        .setDescription(
          `**Removed:** ${amount} ${type}\n` +
          `**From:** ${target.tag} (<@${target.id}>)\n` +
          `**By:** ${message.author.tag} (<@${message.author.id}>)\n` +
          `**Previous:** ${before} → **Now:** ${adventureData[target.id].inventory[type]}`
        )
        .setTimestamp();

      logChannel.send({ embeds: [logEmbed] });
    }
  }
}
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const now = Date.now();

  // CustomId format: "adventure_BeeID_duration"
  const parts = interaction.customId.split("_");
  if (parts[0] !== "adventure" || parts.length !== 3) {
    return interaction.reply({ content: "Invalid button ID.", ephemeral: true });
  }

  const beeId = parts[1];
  const durationStr = parts[2]; // "1h", "3h", or "8h"

  const beeData = loadBeeData();
  const bee = beeData[beeId];

  if (!bee) {
    return interaction.reply({ content: "Bee not found.", ephemeral: true });
  }

  if (bee.owner !== userId) {
    return interaction.reply({ content: "You don't own this bee.", ephemeral: true });
  }

  if (bee.endsAt && now < bee.endsAt) {
    const timeLeft = formatTime(bee.endsAt - now);
    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle("Adventure in Progress")
      .setDescription(`Your Bee is already on an adventure! They will return in **${timeLeft}**🌷`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (bee.cooldownUntil && now < bee.cooldownUntil) {
    const cooldownLeft = formatTime(bee.cooldownUntil - now);
    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle("Recovery Time!")
      .setDescription(`Your Bee is still recovering and will be ready in **${cooldownLeft}**.`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Define rewards based on duration
  let durationMs, cooldownMs, minCoins, maxCoins, flowerChance, maxFlowers;
  if (durationStr === "1h") {
    durationMs = 1 * 60 * 60 * 1000;
    cooldownMs = 12 * 60 * 60 * 1000;
    minCoins = 7;
    maxCoins = 15;
    flowerChance = 0.02;
    maxFlowers = 1;
  } else if (durationStr === "3h") {
    durationMs = 3 * 60 * 60 * 1000;
    cooldownMs = 24 * 60 * 60 * 1000;
    minCoins = 12;
    maxCoins = 30;
    flowerChance = 0.05;
    maxFlowers = 2;
  } else if (durationStr === "8h") {
    durationMs = 8 * 60 * 60 * 1000;
    cooldownMs = 48 * 60 * 60 * 1000;
    minCoins = 23;
    maxCoins = 50;
    flowerChance = 0.1;
    maxFlowers = 3;
  } else {
    return interaction.reply({ content: "Invalid adventure duration.", ephemeral: true });
  }

  // Start adventure for this bee
  bee.endsAt = now + durationMs;
  bee.cooldownUntil = now + durationMs + cooldownMs;
  bee.durationMs = durationMs;
  bee.cooldownMs = cooldownMs;
  bee.minCoins = minCoins;
  bee.maxCoins = maxCoins;
  bee.flowerChance = flowerChance;
  bee.maxFlowers = maxFlowers;

  saveBeeData(beeData);

  const embed = new EmbedBuilder()
    .setColor("#ffe712")
    .setTitle("Adventure!🌸")
    .setDescription(`Yay! Your Bee has started their adventure for **${durationStr}**! They will return then!🌷`);

  await interaction.reply({ embeds: [embed] });

  if (interaction.message.editable) {
    await interaction.message.edit({ components: [] });
  }

 setTimeout(() => {
  const beeData = loadBeeData();
  const bee = beeData[beeId];
  if (!bee) return;

  // Calculate base coins earned (random between min and max)
  let coinsEarned = Math.floor(Math.random() * (bee.maxCoins - bee.minCoins + 1)) + bee.minCoins;

  // Calculate flowers found based on flower chance
  let flowersFound = 0;
  if (Math.random() < bee.flowerChance) {
    flowersFound = 1 + Math.floor(Math.random() * bee.maxFlowers);
  }

  // Load user inventory data (adventureData)
  adventureData = loadAdventureData();
  if (!adventureData[userId]) {
    adventureData[userId] = { inventory: { coins: 0, flowers: 0 } };
  } else if (!adventureData[userId].inventory) {
    adventureData[userId].inventory = { coins: 0, flowers: 0 };
  }

  // Get XP and EP levels BEFORE applying new rewards (to check level ups later)
  const oldXpLevel = getXpLevel(bee.xp);
  const oldEpLevel = getEpLevel(bee.ep);

  // XP and EP rewards based on adventure duration
  let xpReward = 0;
  let epReward = 0;
  if (bee.durationMs === 1 * 60 * 60 * 1000) {
    xpReward = 5;
    epReward = 1;
  } else if (bee.durationMs === 3 * 60 * 60 * 1000) {
    xpReward = 12;
    epReward = 4;
  } else if (bee.durationMs === 8 * 60 * 60 * 1000) {
    xpReward = 35;
    epReward = 10;
  } else {
    xpReward = 5;
    epReward = 1;
  }

  // Get current XP and EP levels before applying rewards (for bonus calculations)
  const xpLevel = oldXpLevel;
  const epLevel = oldEpLevel;

  // Apply XP level bonuses
  if (xpLevel >= 5) coinsEarned += 5;      // +5 coins at XP level 5
  if (xpLevel >= 9) bee.flowerChance += 0.03; // +3% flower chance at XP level 9

  // Apply EP level bonuses
  if (epLevel >= 1) coinsEarned += 5;
  if (epLevel >= 2) { coinsEarned += 10; xpReward += 5; }
  if (epLevel >= 3) { coinsEarned += 15; xpReward += 10; }
  if (epLevel >= 4) { coinsEarned += 20; xpReward += 15; }
  if (epLevel >= 5) { coinsEarned += 30; xpReward += 25; flowersFound += 1; }

  // Add the XP and EP rewards to the bee
  bee.xp += xpReward;
  bee.ep += epReward;

  // Add coins and flowers found to the user’s inventory
  adventureData[userId].inventory.coins += coinsEarned;
  adventureData[userId].inventory.flowers += flowersFound;

  // XP level 10 bonus: +1 flower added directly to user inventory
  if (xpLevel >= 10) {
    adventureData[userId].inventory.flowers += 1;
  }

  // Get new XP and EP levels after adding rewards
  const newXpLevel = getXpLevel(bee.xp);
  const newEpLevel = getEpLevel(bee.ep);

  // Clear adventure status so bee can go again
  bee.endsAt = 0;

  // Save updated data
  saveBeeData(beeData);
  saveAdventureData(adventureData);

  // If bee leveled up in XP or EP, send level-up embed to log channel
  if (newXpLevel > oldXpLevel || newEpLevel > oldEpLevel) {
   const logChannel = client.channels.cache.get(TRACKING_CHANNEL_ID);
    if (logChannel && logChannel.isTextBased()) {
      const levelEmbed = new EmbedBuilder()
        .setColor("#ffe712")
        .setTitle(`Bee ${beeId} has leveled up!`)
        .setDescription(
          `XP Level: ${oldXpLevel} → ${newXpLevel}\n` +
          `EP Level: ${oldEpLevel} → ${newEpLevel}\n` +
          `Current XP: ${bee.xp}\n` +
          `Current EP: ${bee.ep}`
        )
        .setTimestamp();

      logChannel.send({ embeds: [levelEmbed] });
    }
  }

  // Flavor messages for the adventure return
  const flavorMessages = [
    "Your Bee returns home! They tell you about their great adventure... They met a mother duck who lost her ducklings to the quick stream! Your Bee helped them return safely. On the way they encountered a bear as well, who shared some of its honey with your Bee. They loved the adventure and brought you home some trinkets they found:",
    "Buzzing happily, your Bee returns from the meadows beyond the hills! They share tales of shimmering dragonflies, hidden mushroom villages, and a squirrel who challenged them to a leaf-gliding contest. They didn’t win, but they found something special for you along the way:",
    "Your Bee comes flying back, a little muddy but full of joy! They ventured through a rain-drenched forest where they helped a ladybug colony rebuild their homes after a horrid storm. In gratitude, the ladybugs offered your Bee a treasure trove of curiosities filled with:",
    "With wings a little tired but spirit soaring, your Bee lands beside you! They explored the quiet corners of an old orchard, where they met an elderly moth who taught them how to read wind patterns. Along the way, your Bee found some curious objects they knew you'd love:",
    "Back from the wildflower fields, your Bee hums a tune they learned from a singing snail. They visited a hidden garden where fireflies held a lantern dance, and your Bee was invited as guest of honor! In return for a small pollen gift, they received some shiny tokens which they saved for you:",
    "After a long and daring flight, your Bee lands on your shoulder and tells you their story. They ventured into the Woods, where they helped an ant queen find her way, and avoided a raincloud ambush by hiding underneath a big tree. Of course, they protected the queen from the wet. As thanks, the colony left behind a few surprises:",
  ];
  const flavor = flavorMessages[Math.floor(Math.random() * flavorMessages.length)];

  const rewardEmbed = new EmbedBuilder()
    .setColor("#ffe712")
    .setTitle("Welcome back, Bee!")
    .setDescription(`${flavor}\n\nThey brought back **${coinsEarned} coins** 🪙` +
      (flowersFound > 0 ? ` and **${flowersFound} flower${flowersFound > 1 ? "s" : ""}** 🌸` : "") +
      `.\n\nThey’re now resting 🐝`);

  interaction.channel.send({
    content: `<@${userId}>`,
    embeds: [rewardEmbed],
  });
}, durationMs);
});


client.login(TOKEN);

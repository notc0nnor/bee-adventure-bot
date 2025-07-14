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

client.once("ready", () => {
  console.log(`🐝 Logged in as ${client.user.tag}`);
});
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const now = Date.now();

  if (message.content.toLowerCase() === "!adventure") {
    const allowedRoleId = "1389996455921586277";
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const embed = new EmbedBuilder()
        .setColor("#ffe712")
        .setTitle("No Bee Found!")
        .setDescription(
          "It seems like you don't have a Bee that can go on an adventure! 🐝"
        );
      return message.reply({ embeds: [embed] });
    }

    const user = adventureData[userId];

    // ⛔️ Already on adventure
    if (user && user.endsAt && now < user.endsAt) {
      const timeLeft = formatTime(user.endsAt - now);
      const embed = new EmbedBuilder()
        .setColor("#ffe712")
        .setTitle("Ongoing Adventure")
        .setDescription(
          `Your Bee is still on an adventure! They will return in **${timeLeft}** 🌷`
        );
      return message.reply({ embeds: [embed] });
    }

    // ⛔️ On cooldown
    if (user && user.cooldownUntil && now < user.cooldownUntil) {
      const cooldownLeft = formatTime(user.cooldownUntil - now);
      const embed = new EmbedBuilder()
        .setColor("#ffe712")
        .setTitle("Resting Bee.🐝")
        .setDescription(
          `Your Bee is tired after their adventure, they need to rest now. 🌼 They will be ready again in **${cooldownLeft}**.`
        );
      return message.reply({ embeds: [embed] }); // 💡 This prevents the bot from sending buttons
    }

    // ✅ Ready for adventure — send buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("adventure_1h")
        .setLabel("1h")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("adventure_3h")
        .setLabel("3h")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("adventure_8h")
        .setLabel("8h")
        .setStyle(ButtonStyle.Primary)
    );

    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle("Adventure Time!")
      .setDescription("How long does your Bee want to go on an adventure for? 🌸");

    return message.reply({ embeds: [embed], components: [row] });
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  // 📦 !inventory or !inventory @user
  if (command === "!inventory") {
    let user = message.mentions.users.first() || message.author;
    let data = adventureData[user.id];

    if (!data) {
      return message.reply(`${user.username} doesn't have an inventory yet.`);
    }

    const coins = data.inventory?.coins ?? 0;
    const flowers = data.inventory?.flowers ?? 0;

    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle(`${user.username}'s Inventory 🐝`)
      .setDescription(`**Coins:** ${coins} 🪙\n**Flowers:** ${flowers} 🌸`);

    return message.reply({ embeds: [embed] });
  }

  // 🧹 !remove coins 10 @user OR !remove flowers 3 @user
 if (command === "!remove") {
  if (args.length < 3 || !["coins", "flowers"].includes(args[1])) {
    return message.reply("Usage: `!remove coins|flowers amount @user`");
  }

  const type = args[1];
  const amount = parseInt(args[2]);
  const target = message.mentions.users.first();

  if (!target || isNaN(amount) || amount <= 0) {
    return message.reply("Invalid usage or amount.");
  }

  const data = adventureData[target.id];
  if (!data) return message.reply(`${target.username} has no inventory.`);

  const before = data.inventory[type] || 0;
  const newAmount = Math.max(0, before - amount);
  data.inventory[type] = newAmount;
  saveAdventureData();

  await message.reply(`Removed ${amount} ${type} from ${target.username}'s inventory.`);

  // 🔔 Send log to the log channel
  const logChannelId = "1394414785130532976";
  const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
  if (logChannel && logChannel.isTextBased()) {
    const logEmbed = new EmbedBuilder()
      .setColor("#ff6347")
      .setTitle("Inventory Change")
      .setDescription(
        `**Removed:** ${amount} ${type}\n` +
        `**From:** ${target.tag} (<@${target.id}>)\n` +
        `**By:** ${message.author.tag} (<@${message.author.id}>)\n` +
        `**Previous:** ${before} → **Now:** ${newAmount}`
      )
      .setTimestamp();

    logChannel.send({ embeds: [logEmbed] });
  }
}
// 🟢 !add coins 10 @user OR !add flowers 3 @user
if (command === "!add") {
  if (args.length < 3 || !["coins", "flowers"].includes(args[1])) {
    return message.reply("Usage: `!add coins|flowers amount @user`");
  }

  const type = args[1];
  const amount = parseInt(args[2]);
  const target = message.mentions.users.first() || message.author;

  if (isNaN(amount) || amount <= 0) {
    return message.reply("Please provide a valid positive number for the amount.");
  }

  // Initialize inventory if missing
  if (!adventureData[target.id]) {
    adventureData[target.id] = { inventory: { coins: 0, flowers: 0 } };
  } else if (!adventureData[target.id].inventory) {
    adventureData[target.id].inventory = { coins: 0, flowers: 0 };
  }

  const before = adventureData[target.id].inventory[type] || 0;

  // Add amount
  adventureData[target.id].inventory[type] = before + amount;

  saveAdventureData();

  await message.reply(`Added ${amount} ${type} to ${target.username}'s inventory.`);

  // 🔔 Send log to the log channel
  const logChannelId = "1394414785130532976";
  const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
  if (logChannel && logChannel.isTextBased()) {
    const logEmbed = new EmbedBuilder()
      .setColor("#32CD32") // Green for add
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
});


client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const now = Date.now();
  const user = adventureData[userId];

  if (user && user.endsAt && now < user.endsAt) {
    const timeLeft = formatTime(user.endsAt - now);
    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle("Adventure in Progress")
      .setDescription(`Your Bee is already on an adventure! They will return in **${timeLeft}**🌷`);
    return interaction.reply({ embeds: [embed] });
  }

  if (user && user.cooldownUntil && now < user.cooldownUntil) {
    const cooldownLeft = formatTime(user.cooldownUntil - now);
    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle("Recovery Time!")
      .setDescription(`Your Bee is still recovering and will be ready in **${cooldownLeft}**.`);
    return interaction.reply({ embeds: [embed] });
  }

  let durationMs, cooldownMs, minCoins, maxCoins, flowerChance, maxFlowers;

  if (interaction.customId === "adventure_1h") {
    durationMs = 1 * 60 * 60 * 1000;
    cooldownMs = 12 * 60 * 60 * 1000;
    minCoins = 7;
    maxCoins = 15;
    flowerChance = 0.02;
    maxFlowers = 1;
  } else if (interaction.customId === "adventure_3h") {
    durationMs = 3 * 60 * 60 * 1000;
    cooldownMs = 24 * 60 * 60 * 1000;
    minCoins = 12;
    maxCoins = 30;
    flowerChance = 0.05;
    maxFlowers = 2;
  } else if (interaction.customId === "adventure_8h") {
    durationMs = 8 * 60 * 60 * 1000;
    cooldownMs = 48 * 60 * 60 * 1000;
    minCoins = 23;
    maxCoins = 50;
    flowerChance = 0.1;
    maxFlowers = 3;
  } else {
    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle("Oops!")
      .setDescription("Something is wrong, please ping Grace.");
    return interaction.reply({ embeds: [embed] });
  }

 adventureData[userId] = {
  endsAt: now + durationMs,
  cooldownUntil: now + durationMs + cooldownMs,
  durationMs,
  cooldownMs,
  minCoins,
  maxCoins,
  flowerChance,
  maxFlowers,
  inventory: user?.inventory ?? { coins: 0, flowers: 0 },
};
  saveAdventureData();

  const embed = new EmbedBuilder()
    .setColor("#ffe712")
    .setTitle("Adventure!🌸")
    .setDescription(`Yay! Your Bee has started their adventure for **${interaction.customId.slice(10)}**! They will return then!🌷`);

  await interaction.reply({ embeds: [embed] });

  if (interaction.message.editable) {
    await interaction.message.edit({ components: [] });
  }

  setTimeout(() => {
    const user = adventureData[userId];
    if (!user.inventory) {
  user.inventory = { coins: 0, flowers: 0 };
}
    if (!user) return;

    const coinsEarned = Math.floor(Math.random() * (user.maxCoins - user.minCoins + 1)) + user.minCoins;

    let flowersFound = 0;
    if (Math.random() < user.flowerChance) {
      flowersFound = 1 + Math.floor(Math.random() * user.maxFlowers);
    }

    user.inventory.coins += coinsEarned;
    user.inventory.flowers += flowersFound;
    user.endsAt = null;
    saveAdventureData();

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

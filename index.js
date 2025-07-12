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
        .setDescription("It seems like you don't have a Bee that can go on an adventure! 🐝");
      return message.reply({ embeds: [embed] });
    }

    const user = adventureData[userId];

    if (user && user.endsAt && now < user.endsAt) {
      const timeLeft = formatTime(user.endsAt - now);
      const embed = new EmbedBuilder()
        .setColor("#ffe712")
        .setTitle("Ongoing Adventure")
        .setDescription(`Your Bee is still on an adventure! They will return in **${timeLeft}** 🌷`);
      return message.reply({ embeds: [embed] });
    }

    if (user && user.cooldownUntil && now < user.cooldownUntil) {
      const cooldownLeft = formatTime(user.cooldownUntil - now);
      const embed = new EmbedBuilder()
        .setColor("#ffe712")
        .setTitle("Resting Bee.🐝")
        .setDescription(`Your Bee is tired and will be ready again in **${cooldownLeft}**.`);
      return message.reply({ embeds: [embed] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("adventure_1h").setLabel("1h").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("adventure_3h").setLabel("3h").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("adventure_8h").setLabel("8h").setStyle(ButtonStyle.Primary)
    );

    const embed = new EmbedBuilder()
      .setColor("#ffe712")
      .setTitle("Adventure Time!")
      .setDescription("How long does your Bee want to go on an adventure for? 🌸");

    return message.reply({ embeds: [embed], components: [row] });
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const userId = interaction.user.id;
  const now = Date.now();
  const user = adventureData[userId];

  if (interaction.customId.startsWith("claim_")) {
    const amount = parseInt(interaction.customId.split("_")[1]);
    await interaction.reply({
      content: `-give-money <@${userId}> ${amount}`,
      ephemeral: false,
    });
    await interaction.message.edit({ components: [] });
    return;
  }

  if (user && user.endsAt && now < user.endsAt) {
    const timeLeft = formatTime(user.endsAt - now);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#ffe712")
          .setTitle("Adventure in Progress")
          .setDescription(`Your Bee will return in **${timeLeft}**🌷`),
      ],
      ephemeral: true,
    });
  }

  if (user && user.cooldownUntil && now < user.cooldownUntil) {
    const cooldownLeft = formatTime(user.cooldownUntil - now);
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#ffe712")
          .setTitle("Resting Bee")
          .setDescription(`They’ll be ready in **${cooldownLeft}**.`),
      ],
      ephemeral: true,
    });
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
    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#ffe712")
          .setTitle("Oops!")
          .setDescription("Something is wrong, please ping Grace."),
      ],
      ephemeral: true,
    });
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
    inventory: user ? user.inventory : { coins: 0, flowers: 0 },
  };
  saveAdventureData();

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#ffe712")
        .setTitle("Adventure!🌸")
        .setDescription(
          `Yay! Your Bee started a **${interaction.customId.slice(10)}** adventure! 🌷`
        ),
    ],
  });

  if (interaction.message.editable) {
    await interaction.message.edit({ components: [] });
  }

setTimeout(async () => {
  const user = adventureData[userId];
  if (!user) return;

  const coinsEarned =
    Math.floor(Math.random() * (user.maxCoins - user.minCoins + 1)) + user.minCoins;

  let flowersFound = 0;
  if (Math.random() < user.flowerChance) {
    flowersFound = 1 + Math.floor(Math.random() * user.maxFlowers);
  }

  user.inventory.coins += coinsEarned;
  user.inventory.flowers += flowersFound;
  user.endsAt = null;
  saveAdventureData();

  const flavorMessages = [
      "Your Bee returns home! They tell you about their great adventure... They met a mother duck who lost her ducklings to the quick stream! Your Bee helped them return safely...",
      "Buzzing happily, your Bee returns from the meadows beyond the hills! They share tales of shimmering dragonflies, hidden mushroom villages...",
      "Your Bee comes flying back, a little muddy but full of joy! They ventured through a rain-drenched forest where they helped a ladybug colony rebuild...",
      "With wings a little tired but spirit soaring, your Bee lands beside you! They explored the quiet corners of an old orchard...",
      "Back from the wildflower fields, your Bee hums a tune they learned from a singing snail. They visited a hidden garden where fireflies held a lantern dance...",
      "After a long and daring flight, your Bee lands on your shoulder and tells you their story. They ventured into the Woods and helped an ant queen...",
  ];
  const flavor = flavorMessages[Math.floor(Math.random() * flavorMessages.length)];

  const rewardEmbed = new EmbedBuilder()
    .setColor("#ffe712")
    .setTitle("Welcome back, Bee!")
    .setDescription(
      `${flavor}\n\nThey brought back **${coinsEarned} coins** 🪙${
        flowersFound > 0 ? ` and **${flowersFound} flower${flowersFound > 1 ? "s" : ""}** 🌸` : ""
      }.\n\nThey’re now resting 🐝`
    );

  const channel = client.channels.cache.get(interaction.channel.id);
  if (channel) {
    channel.send({
      content: `<@${userId}>`,
      embeds: [rewardEmbed],
    });
  }
}, durationMs);
});

client.login(TOKEN);

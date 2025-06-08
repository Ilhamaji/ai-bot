const discord = require("discord.js");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const MODEL = "gemini-2.0-flash";
const API_KEY = process.env.API_KEY;
const BOT_TOKEN = process.env.BOT_TOKEN;
const ai = new GoogleGenerativeAI(API_KEY);
const model = ai.getGenerativeModel({ model: MODEL });

const client = new discord.Client({
  intents: Object.keys(discord.GatewayIntentBits),
});
client.on("ready", () => {
  console.log("Bot is ready");
});
client.login(BOT_TOKEN);

client.on("messageCreate", async (message, maxTokens) => {
  try {
    const prefix = "?";
    if (!message.content.startsWith(prefix)) return;
    if (message.author.bot) return;
    const { response } = await model.generateContent(message.cleanContent);

    if (response.text().length <= 2000) {
      await message.reply({
        content: response.text(),
      });
    }
    if (response.text().length > 2000) {
      await message.reply({
        content: response.text().substring(0, 2000),
      });
      await message.reply({
        content: response.text().substring(2000, 4000),
      });
    }
    if (response.text().length > 4000) {
      await message.reply({
        content: response.text().substring(4000, 6000),
      });
    }
    if (response.text().length > 6000) {
      await message.reply({
        content: "```⛔ Text is too long !```",
      });
    }
  } catch (error) {
    console.log(error);
  }
});

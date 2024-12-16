const discord = require("discord.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const MODEL = "gemini-1.5-flash";
const API_KEY = "AIzaSyCIpS0ENx67-s5ZD0MmahYNiEpmGCExrLA";
const BOT_TOKEN = "MTMwODc3MDkyMDU2MjgyMzIyOA.GNepK7.Toc31c6yJoFtiIPz4cq_bZUV5UrF9UofncaxkQ";
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
    if (response.text().length > 2000){
        await message.reply({
          content: response.text().substring(0, 1970)+"\n```Text too long !```",
        });
    }
    await message.reply({
      content: response.text(),
    });
  } catch (error) {
    console.log(error);
  }
});

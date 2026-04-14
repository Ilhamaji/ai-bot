const { Client, GatewayIntentBits, Collection } = require("discord.js");
require("dotenv").config();
const { OpenAI } = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdf = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const FormData = require("form-data");

// --- MODEL SELECTION ---
const VISION_MODELS = [
  { provider: "google-native", name: "gemini-2.0-flash" },
  { provider: "openrouter", name: "google/gemini-2.0-flash-001" },
  { provider: "openrouter", name: "meta-llama/llama-3.2-90b-vision-instruct:free" }
];

const TEXT_MODELS = [
  { provider: "google-native", name: "gemini-2.0-flash" },
  { provider: "groq", name: "llama-3.3-70b-versatile" }, // 280 T/s - Sangat Pintar
  { provider: "groq", name: "openai/gpt-oss-120b" },    // 500 T/s - Model Raksasa (Cerdas!)
  { provider: "groq", name: "openai/gpt-oss-20b" },     // 1000 T/s - Super Cepat
  { provider: "groq", name: "llama-3.1-8b-instant" },   // 560 T/s - Hemat Quota
  { provider: "openrouter", name: "openai/gpt-oss-120b:free" },
  { provider: "openrouter", name: "deepseek/deepseek-r1:free" },
  { provider: "openrouter", name: "meta-llama/llama-3.3-70b-instruct:free" },
  { provider: "openrouter", name: "qwen/qwen-2.5-72b-instruct:free" },
  { provider: "openrouter", name: "openrouter/free" }
];

// --- INITIALIZE PROVIDERS ---
const OR_API_KEY = process.env.API_KEY || "";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const BOT_TOKEN = process.env.BOT_TOKEN || "";

const openrouter = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: OR_API_KEY });
const groq = new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const sessions = new Map();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// --- HELPER FUNCTIONS ---

async function transcribeVideo(videoUrl, tempDir) {
  const uniqueId = Date.now();
  const videoPath = path.join(tempDir, `v_${uniqueId}.mp4`);
  const audioPath = path.join(tempDir, `a_${uniqueId}.mp3`);
  try {
    const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(videoPath, Buffer.from(response.data));
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath).toFormat("mp3").duration(120).on("end", resolve).on("error", reject).save(audioPath);
    });
    const form = new FormData();
    form.append("file", fs.createReadStream(audioPath));
    form.append("model", "openai/whisper-large-v3");
    const whisperRes = await axios.post("https://openrouter.ai/api/v1/audio/transcriptions", form, {
      headers: { ...form.getHeaders(), "Authorization": `Bearer ${OR_API_KEY}` },
      timeout: 60000 
    });
    return whisperRes.data.text || "(No audible speech detected)";
  } catch (error) {
    return `(Transcription failed: ${error.message})`;
  } finally {
    if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
  }
}

function splitMessage(text, maxLength = 2000) {
  const chunks = [];
  let currentChunk = "";
  let isInsideCodeBlock = false;
  let codeLanguage = "";
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      isInsideCodeBlock = !isInsideCodeBlock;
      codeLanguage = isInsideCodeBlock ? line.trim().substring(3) : "";
    }
    if (currentChunk.length + line.length + 1 > maxLength) {
      if (isInsideCodeBlock) {
        chunks.push(currentChunk + "\n```");
        currentChunk = "```" + codeLanguage + "\n" + line + "\n";
      } else {
        chunks.push(currentChunk);
        currentChunk = line + "\n";
      }
    } else {
      currentChunk += line + "\n";
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
  return chunks;
}

async function fetchWithFallback(messagesArray, modelList) {
  for (const model of modelList) {
    try {
      console.log(`[🤖] Attempting ${model.provider}: ${model.name}`);
      if (model.provider === "openrouter") {
        const completion = await openrouter.chat.completions.create({ model: model.name, messages: messagesArray, timeout: 30000 });
        console.log(`[✅] Success using OpenRouter: ${model.name}`);
        return completion.choices[0].message.content;
      } 
      if (model.provider === "groq") {
        const completion = await groq.chat.completions.create({ model: model.name, messages: messagesArray, timeout: 20000 });
        console.log(`[✅] Success using Groq: ${model.name}`);
        return completion.choices[0].message.content;
      }
      if (model.provider === "google-native") {
        const genModel = genAI.getGenerativeModel({ model: model.name });
        const lastMsg = messagesArray[messagesArray.length - 1];
        if (Array.isArray(lastMsg.content)) {
          const textPart = lastMsg.content.find(c => c.type === "text")?.text || "";
          const imageParts = await Promise.all(
            lastMsg.content.filter(c => c.type === "image_url").map(async (img) => {
              const response = await axios.get(img.image_url.url, { responseType: 'arraybuffer' });
              return { inlineData: { data: Buffer.from(response.data).toString("base64"), mimeType: "image/png" } };
            })
          );
          const result = await genModel.generateContent([textPart, ...imageParts]);
          return result.response.text();
        } else {
          const result = await genModel.generateContent(lastMsg.content);
          return result.response.text();
        }
      }
    } catch (error) {
      console.warn(`[⚠️] ${model.name} (${model.provider}) failed: ${error.message}`);
      continue; 
    }
  }
  throw new Error("All providers and models failed.");
}

// --- CORE MESSAGE EVENT ---
client.on("ready", () => console.log(`Bot is ready as ${client.user.tag}`));

client.on("messageCreate", async (message) => {
  if (!message.content.startsWith("?") || message.author.bot) return;

  const promptText = message.content.slice(1).trim();
  const sessionId = `${message.channel.id}-${message.author.id}`;
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  try {
    await message.channel.sendTyping();

    let userSession = sessions.get(sessionId);
    if (!userSession || (Date.now() - userSession.lastUpdated > ONE_DAY_MS)) {
      userSession = { 
        messages: [{ role: "system", content: "You are a smart Discord assistant made by M." }], 
        lastUpdated: Date.now() 
      };
      sessions.set(sessionId, userSession);
    }
    userSession.lastUpdated = Date.now();

    let combinedAttachments = new Collection(message.attachments);
    let contextText = "";

    if (message.reference) {
      const replied = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (replied) {
        contextText = `\n[CONTEXT]: "${replied.content}"\n`;
        replied.attachments.forEach((att, id) => combinedAttachments.set(id, att));
      }
    }

    let extracted = contextText;
    
    // PDF EXTRACTION
    const pdfs = combinedAttachments.filter(a => a.contentType === "application/pdf");
    for (const [id, att] of pdfs) {
      const res = await axios.get(att.url, { responseType: 'arraybuffer' });
      const data = await pdf(Buffer.from(res.data));
      extracted += `\n[PDF: ${att.name}]\n${data.text}\n`;
    }

    // VIDEO EXTRACTION
    const videos = combinedAttachments.filter(a => a.contentType?.startsWith("video/"));
    for (const [id, att] of videos) {
      const transcript = await transcribeVideo(att.url, tempDir);
      extracted += `\n[VIDEO TRANSCRIPT]: ${transcript}\n`;
    }

    const hasImage = combinedAttachments.some(a => a.contentType?.startsWith("image/"));
    const finalModelList = hasImage ? VISION_MODELS : TEXT_MODELS;
    const finalPrompt = `${extracted}\nUSER: ${promptText}`.trim();

    let currentPayload;
    if (hasImage) {
      currentPayload = [{ type: "text", text: finalPrompt }];
      combinedAttachments.forEach(a => {
        if (a.contentType?.startsWith("image/")) currentPayload.push({ type: "image_url", image_url: { url: a.url } });
      });
    } else {
      currentPayload = finalPrompt;
    }

    const requestMessages = [...userSession.messages, { role: "user", content: currentPayload }];
    const responseText = await fetchWithFallback(requestMessages, finalModelList);

    userSession.messages.push({ role: "user", content: finalPrompt });
    userSession.messages.push({ role: "assistant", content: responseText });

    const chunks = splitMessage(responseText);
    for (const chunk of chunks) await message.reply(chunk);

  } catch (error) {
    console.error(error);
    await message.reply("```All providers (Google, Groq, OpenRouter) are currently exhausted or unavailable. Please try again in a few minutes.```");
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastUpdated > ONE_DAY_MS) sessions.delete(id);
  }
}, 6 * 60 * 60 * 1000);

client.login(BOT_TOKEN);

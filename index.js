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
const crypto = require("crypto");

// --- CONFIGURATION ---
const CONTEXT_SCOPE = "channel_user"; // Pilihan: "user", "channel", "server", "channel_user"
const MAX_HISTORY = 10; // Batas jumlah pesan yang diingat per sesi
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// --- MODEL SELECTION ---
const VISION_MODELS = [
  { provider: "google-native", name: "gemini-2.0-flash" },
  { provider: "openrouter", name: "google/gemini-2.0-flash-001" },
  { provider: "openrouter", name: "meta-llama/llama-3.2-90b-vision-instruct:free" }
];

const TEXT_MODELS = [    
  { provider: "google-native", name: "gemini-2.0-flash" },
  { provider: "groq", name: "llama-3.3-70b-versatile" },
  { provider: "groq", name: "openai/gpt-oss-120b" },
  { provider: "groq", name: "openai/gpt-oss-20b" },
  { provider: "groq", name: "llama-3.1-8b-instant" },
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

// --- HELPER FUNCTIONS ---

function getSessionId(message) {
  switch (CONTEXT_SCOPE) {
    case "user": return message.author.id;
    case "channel": return message.channel.id;
    case "server": return message.guild ? message.guild.id : message.channel.id;
    case "channel_user": default: return `${message.channel.id}-${message.author.id}`;
  }
}

function sanitizeMessagesForModel(messages, isVisionModel) {
  return messages.map(msg => {
    if (msg.role === "system") return msg;
    if (typeof msg.content === "string") return msg;
    
    if (!isVisionModel && Array.isArray(msg.content)) {
      const textOnly = msg.content.filter(c => c.type === "text").map(c => c.text).join("\n");
      return { ...msg, content: textOnly };
    }
    return msg;
  });
}

async function transcribeMedia(mediaUrl, tempDir, isAudioOnly = false) {
  const uniqueId = crypto.randomUUID();
  const inputPath = path.join(tempDir, `in_${uniqueId}.${isAudioOnly ? 'mp3' : 'mp4'}`);
  const audioPath = path.join(tempDir, `out_${uniqueId}.mp3`);
  
  try {
    const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(inputPath, Buffer.from(response.data));
    
    if (!isAudioOnly) {
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath).toFormat("mp3").duration(120).on("end", resolve).on("error", reject).save(audioPath);
      });
    }

    const fileToUpload = isAudioOnly ? inputPath : audioPath;
    const form = new FormData();
    form.append("file", fs.createReadStream(fileToUpload));
    form.append("model", "openai/whisper-large-v3");
    
    const whisperRes = await axios.post("https://openrouter.ai/api/v1/audio/transcriptions", form, {
      headers: { ...form.getHeaders(), "Authorization": `Bearer ${OR_API_KEY}` },
      timeout: 60000 
    });
    return whisperRes.data.text || "(No audible speech detected)";
  } catch (error) {
    console.error(`[Audio/Video Error]: ${error.message}`);
    return `(Transcription failed: ${error.message})`;
  } finally {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
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

// --- UPDATED FETCH WITH FALLBACK ---
async function fetchWithFallback(messagesArray, isVisionContext) {
  const modelList = isVisionContext ? VISION_MODELS : TEXT_MODELS;

  for (const model of modelList) {
    try {
      console.log(`[🤖] Attempting ${model.provider}: ${model.name}`);
      
      const safeMessages = sanitizeMessagesForModel(messagesArray, isVisionContext);

      if (model.provider === "openrouter") {
        const payload = { model: model.name, messages: safeMessages };
        const options = { timeout: 30000 };
        
        const completion = await openrouter.chat.completions.create(payload, options);
        console.log(`[✅] Success: ${model.name}`);
        return completion.choices[0].message.content;
      } 
      
      if (model.provider === "groq") {
        const payload = { model: model.name, messages: safeMessages };
        const options = { timeout: 20000 };
        
        const completion = await groq.chat.completions.create(payload, options);
        console.log(`[✅] Success: ${model.name}`);
        return completion.choices[0].message.content;
      }
      
      if (model.provider === "google-native") {
        const genModel = genAI.getGenerativeModel({ model: model.name });
        
        const formattedHistory = safeMessages.slice(1, -1).map(msg => {
            let textContent = "";
            if (typeof msg.content === "string") {
                textContent = msg.content;
            } else if (Array.isArray(msg.content)) {
                textContent = msg.content.filter(c => c.type === "text").map(c => c.text).join("\n");
            }
            return {
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: textContent }]
            };
        });
        
        const chat = genModel.startChat({ history: formattedHistory.length > 0 ? formattedHistory : undefined });
        const lastMsg = safeMessages[safeMessages.length - 1];
        
        if (Array.isArray(lastMsg.content)) {
          const textPart = lastMsg.content.find(c => c.type === "text")?.text || "";
          const imageParts = await Promise.all(
            lastMsg.content.filter(c => c.type === "image_url").map(async (img) => {
              const response = await axios.get(img.image_url.url, { responseType: 'arraybuffer' });
              return { inlineData: { data: Buffer.from(response.data).toString("base64"), mimeType: "image/png" } };
            })
          );
          const result = await chat.sendMessage([textPart, ...imageParts]);
          console.log(`[✅] Success: ${model.name}`);
          return result.response.text();
        } else {
          const result = await chat.sendMessage(lastMsg.content);
          console.log(`[✅] Success: ${model.name}`);
          return result.response.text();
        }
      }

    } catch (error) {
      if (error.message.includes("429 Too Many Requests")) {
         console.warn(`[⚠️] ${model.provider} failed: Quota Exceeded (429). Falling back...`);
      } else {
         console.warn(`[⚠️] ${model.provider} failed: ${error.message}`);
      }
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
  const sessionId = getSessionId(message);
  const tempDir = path.join(__dirname, "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  try {
    await message.channel.sendTyping();

    let userSession = sessions.get(sessionId);
    if (!userSession || (Date.now() - userSession.lastUpdated > ONE_DAY_MS)) {
      userSession = { 
        messages: [{ role: "system", content: "You are a smart Discord assistant made by M. Always answer clearly." }], 
        lastUpdated: Date.now(),
        hasImageInHistory: false 
      };
      sessions.set(sessionId, userSession);
    }
    userSession.lastUpdated = Date.now();

    let combinedAttachments = new Collection(message.attachments);
    let contextText = "";

    if (message.reference) {
      const replied = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (replied) {
        contextText = `\n[REPLY CONTEXT]: "${replied.content}"\n`;
        replied.attachments.forEach((att, id) => combinedAttachments.set(id, att));
      }
    }

    const pdfs = combinedAttachments.filter(a => a.contentType === "application/pdf");
    const media = combinedAttachments.filter(a => a.contentType?.startsWith("video/") || a.contentType?.startsWith("audio/"));
    const images = combinedAttachments.filter(a => a.contentType?.startsWith("image/"));
    
    let extractedData = contextText;

    const pdfPromises = pdfs.map(async (att) => {
        const res = await axios.get(att.url, { responseType: 'arraybuffer' });
        const data = await pdf(Buffer.from(res.data));
        return `\n[PDF: ${att.name}]\n${data.text.substring(0, 5000)}...\n`;
    });

    const mediaPromises = media.map(async (att) => {
        const isAudio = att.contentType.startsWith("audio/");
        const transcript = await transcribeMedia(att.url, tempDir, isAudio);
        return `\n[MEDIA TRANSCRIPT (${isAudio ? 'Audio' : 'Video'})]: ${transcript}\n`;
    });

    const results = await Promise.all([...pdfPromises, ...mediaPromises]);
    extractedData += results.join("");

    const hasNewImage = images.size > 0;
    const finalPrompt = `${extractedData}\nUSER: ${promptText}`.trim();
    let currentPayload;

    if (hasNewImage) {
      userSession.hasImageInHistory = true;
      currentPayload = [{ type: "text", text: finalPrompt }];
      images.forEach(a => currentPayload.push({ type: "image_url", image_url: { url: a.url } }));
    } else {
      currentPayload = finalPrompt;
    }

    const isVisionContext = hasNewImage || userSession.hasImageInHistory;

    const requestMessages = [...userSession.messages, { role: "user", content: currentPayload }];
    
    const responseText = await fetchWithFallback(requestMessages, isVisionContext);

    userSession.messages.push({ role: "user", content: currentPayload }); 
    userSession.messages.push({ role: "assistant", content: responseText });

    if (userSession.messages.length > MAX_HISTORY * 2 + 1) { 
        userSession.messages = [
            userSession.messages[0], 
            ...userSession.messages.slice(-(MAX_HISTORY * 2))
        ];
    }

    const chunks = splitMessage(responseText);
    for (const chunk of chunks) await message.reply(chunk);

  } catch (error) {
    console.error(error);
    await message.reply("```All providers are currently exhausted or unavailable. Please try again.```");
  }
});

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastUpdated > ONE_DAY_MS) sessions.delete(id);
  }
}, 6 * 60 * 60 * 1000);

client.login(BOT_TOKEN);

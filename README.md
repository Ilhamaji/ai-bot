# <img src="[https://raw.githubusercontent.com/discordjs/discord.js/main/packages/discord.js/assets/logo.svg](https://www.google.com/search?q=https://raw.githubusercontent.com/discordjs/discord.js/main/packages/discord.js/assets/logo.svg)" alt="Discord.js Logo" width="36" height="36" align="top" /\> AI Discord Bot

An intelligent and versatile Discord chatbot built with **JavaScript** and **Discord.js**. This bot integrates advanced AI models to provide real-time interaction, automated responses, and enhanced community engagement within your Discord server.

## 🚀 Features

  * **Real-time AI Interaction**: Natural and fluid conversations powered by [Insert AI Model, e.g., OpenAI/Gemini/Ollama].
  * **Contextual Awareness**: Remembers previous messages for more coherent and human-like interactions.
  * **Multi-Modal Support**: Ability to process text and images (depending on the integrated model).
  * **Slash Commands**: Modern Discord integration using `/` commands for easy usage.
  * **Highly Customizable**: Easily configurable prefixes, personality traits, and permission levels.

## 🛠️ Built With

  * **Language**: [Node.js](https://nodejs.org/) (JavaScript)
  * **Library**: [Discord.js](https://discord.js.org/)
  * **Environment**: [NPM / Yarn]
  * **AI Engine**: [Insert Engine, e.g., Gemini API / OpenAI API]

## 📦 Installation

To host this bot locally or on a server, follow these steps:

1.  **Clone the repository**

    ```bash
    git clone https://github.com/Ilhamaji/ai-bot.git
    cd ai-bot
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory and add your secret tokens:

    ```env
    DISCORD_TOKEN=your_discord_bot_token
    CLIENT_ID=your_discord_client_id
    AI_API_KEY=your_ai_provider_key
    ```

4.  **Register Slash Commands** (If applicable)

    ```bash
    node deploy-commands.js
    ```

## 📋 Usage

To start the bot:

```bash
node index.js
```

*Or, if you use PM2/Nodemon:*

```bash
nodemon index.js
```

### Example Commands

  * `!ask [your question]` — Ask the AI a question (Prefix mode).
  * `/chat [message]` — Start a conversation (Slash command mode).
  * `/clear` — Clear the conversation history.

## ⚙️ Configuration

You can modify the bot's behavior in the `config.json` or `settings.js` file:

  * **Temperature**: Control the creativity of the responses.
  * **System Prompt**: Define the bot's "personality" (e.g., "You are a helpful assistant").
  * **Channels**: Restrict the bot to specific text channels.

## 🤝 Contributing

1.  Fork the Project.
2.  Create your Feature Branch (`git checkout -b feature/CoolFeature`).
3.  Commit your Changes (`git commit -m 'Add some CoolFeature'`).
4.  Push to the Branch (`git push origin feature/CoolFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

## ✉️ Contact

**Ilham Aji** - [GitHub Profile](https://www.google.com/search?q=https://github.com/Ilhamaji)  
Project Link: [https://github.com/Ilhamaji/ai-bot](https://www.google.com/search?q=https://github.com/Ilhamaji/ai-bot)

-----

*Disclaimer: Ensure you comply with the terms of service of your AI provider and Discord's Developer Policy.*

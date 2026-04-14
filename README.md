# AI Discord Bot

An intelligent and versatile Discord chatbot built with **JavaScript** and **Discord.js**. This bot integrates advanced AI models to provide real-time interaction, automated responses, and enhanced community engagement within your Discord server.
Demo: [AI M](https://discord.com/oauth2/authorize?client_id=1308770920562823228)

## 🚀 Features

  * **Real-time AI Interaction**: Natural and fluid conversations powered by [Insert AI Model, e.g., OpenAI/Gemini/Ollama].
  * **Contextual Awareness**: Remembers previous messages for more coherent and human-like interactions.
  * **Multi-Modal Support**: Ability to process text and images (depending on the integrated model).
  * **Slash Commands**: Modern Discord integration using `?` commands for easy usage.
  * **Highly Customizable**: Easily configurable prefixes, personality traits, and permission levels.

## 🛠️ Built With

  * **Language**: [Node.js](https://nodejs.org/) (JavaScript)
  * **Library**: [Discord.js](https://discord.js.org/)
  * **Environment**: NPM / Yarn
  * **AI Engine**: Gemini API , OpenAI API, Etc.

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
    API_KEY= //OpenRemote
    GOOGLE_API_KEY= //Google
    GROQ_API_KEY= //Groq
    BOT_TOKEN= //Bot Token
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

  * `?[your question]` — Ask the AI a question (Prefix mode).

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

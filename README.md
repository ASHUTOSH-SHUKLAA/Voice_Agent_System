# Voice-Based AI Agent with Memory & Tools

This is a full-stack Voice AI Agent built with Node.js, Express, and OpenAI. It features a modern frontend that uses the Web Speech API for voice interaction and an intelligent backend that manages tasks and personal memories.

## Features

- **🎙️ Voice Interface**: Hands-free interaction using browser-based Speech-to-Text and Text-to-Speech.
- **🤖 Intelligent Agent**: Uses OpenAI Function Calling to decide when to manage tasks or remember information.
- **📝 Todo Management**: Add, list, and delete tasks via voice commands.
- **🧠 Personal Memory**: Shares personal info? The agent remembers it for future conversations.
- **💾 Persistent Storage**: Uses JSON files (`data/todos.json`, `data/memory.json`) for persistence.

## Tech Stack

- **Backend**: Node.js, Express, Groq SDK
- **Frontend**: Vanilla HTML5, CSS3 (Premium Glassmorphic Design), Vanilla JavaScript
- **APIs**: Web Speech (STT), SpeechSynthesis (TTS), Groq Cloud (Llama 3.3)

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Open the `.env` file and add your Groq API key:
   ```env
   GROQ_API_KEY=gsk-your-key-here
   ```

3. **Start the Server**:
   ```bash
   npm start
   ```

4. **Access the App**:
   Open your browser and navigate to `http://localhost:3000`.

## How to Use

1. Click the **🎙️ Start Listening** button.
2. Grant microphone permissions if prompted.
3. Speak a command like:
   - *"Add 'Buy groceries' to my list."*
   - *"What's on my todo list?"*
   - *"Remember that my cat's name is Luna."*
   - *"What is my cat's name?"*
4. The agent will process your voice, perform the action, and respond back via voice!

## Project Structure

- `server.js`: Main Express entry point.
- `agent/`: Contains agent logic and system prompts.
- `tools/`: CRUD logic for the todo list.
- `memory/`: Logic for saving and retrieving user memories.
- `public/`: Frontend assets (HTML, CSS, JS).
- `data/`: JSON storage for persistent data.

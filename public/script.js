/**
 * script.js - Frontend logic for Speech-to-Text and Text-to-Speech
 */

const listenBtn = document.getElementById('listen-btn');
const btnText = document.getElementById('btn-text');
const statusText = document.getElementById('status');
const visualizer = document.getElementById('visualizer');
const userTranscriptDisplay = document.getElementById('user-transcript');
const aiResponseDisplay = document.getElementById('ai-response');

// ─── Speech Recognition Setup ────────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
        isListening = true;
        listenBtn.classList.add('recording');
        visualizer.parentElement.classList.add('listening');
        btnText.textContent = 'Recording...';
        statusText.textContent = 'I am listening, speak now...';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userTranscriptDisplay.textContent = transcript;
        processUserInput(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        stopListening();
        statusText.textContent = `Error: ${event.error}`;
    };

    recognition.onend = () => {
        stopListening();
    };
} else {
    statusText.textContent = 'Web Speech API is not supported in this browser.';
    listenBtn.disabled = true;
}

function stopListening() {
    isListening = false;
    listenBtn.classList.remove('recording');
    visualizer.parentElement.classList.remove('listening');
    btnText.textContent = 'Start Listening';
    statusText.textContent = 'Click to start listening';
}

// ─── Interaction Logic ───────────────────────────────────────────────────────

listenBtn.addEventListener('click', () => {
    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
});

async function processUserInput(text) {
    statusText.textContent = 'Thinking...';
    aiResponseDisplay.textContent = '...';

    try {
        const response = await fetch('/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        const aiText = data.response;

        aiResponseDisplay.textContent = aiText;
        speak(aiText);
    } catch (error) {
        console.error('API Error:', error);
        aiResponseDisplay.textContent = "Error: Couldn't connect to server.";
        speak("I'm sorry, I'm having trouble connecting to the server.");
    } finally {
        statusText.textContent = 'Ready';
    }
}

// ─── Text-to-Speech ──────────────────────────────────────────────────────────

function speak(text) {
    if ('speechSynthesis' in window) {
        // Cancel any pending speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Pick a nice voice if available
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang === 'en-US') || voices[0];
        
        if (preferredVoice) utterance.voice = preferredVoice;
        
        utterance.pitch = 1;
        utterance.rate = 1;
        
        window.speechSynthesis.speak(utterance);
    }
}

// Populate voices (some browsers need this)
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

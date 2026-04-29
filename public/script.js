/**
 * script.js - Frontend logic for the authenticated assistant page
 */

const AUTH_TOKEN_KEY = 'voice_agent_token';
const AUTH_USER_KEY = 'voice_agent_user';

const logoutBtn = document.getElementById('logout-btn');

const listenBtn = document.getElementById('listen-btn');
const btnText = document.getElementById('btn-text');
const textForm = document.getElementById('text-form');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const statusText = document.getElementById('status');
const visualizer = document.getElementById('visualizer');
const userTranscriptDisplay = document.getElementById('user-transcript');
const aiResponseDisplay = document.getElementById('ai-response');

let mediaRecorder;
let mediaStream;
let audioChunks = [];
let isRecording = false;
let voiceInputAvailable = true;
let authToken = localStorage.getItem(AUTH_TOKEN_KEY) || '';
let authUser = localStorage.getItem(AUTH_USER_KEY) || '';

function redirectToLogin() {
    window.location.href = '/login';
}

function clearSession() {
    authToken = '';
    authUser = '';
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function setVoiceUnavailable(message) {
    voiceInputAvailable = false;
    listenBtn.disabled = true;
    listenBtn.title = 'Voice input is unavailable';
    statusText.textContent = message;
}

function setIdleStatus() {
    statusText.textContent = voiceInputAvailable ? 'Ready' : 'Voice input unavailable. Use text input below.';
}

async function apiFetch(url, options = {}) {
    const headers = {
        ...(options.headers || {}),
    };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
        clearSession();
        redirectToLogin();
        throw new Error('Unauthorized');
    }

    return response;
}

async function restoreSession() {
    if (!authToken) {
        redirectToLogin();
        return false;
    }

    try {
        const response = await apiFetch('/auth/me', { method: 'GET' });
        const data = await response.json();
        authUser = data.user.email;
        localStorage.setItem(AUTH_USER_KEY, authUser);
        listenBtn.disabled = false;
        listenBtn.title = '';
        aiResponseDisplay.textContent = 'Session verified. Ask me anything.';
        await ensureRecorderReady();
        setIdleStatus();
        return true;
    } catch (error) {
        clearSession();
        redirectToLogin();
        return false;
    }
}

async function ensureRecorderReady() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
        setVoiceUnavailable('Voice recording is not supported in this browser. Use text input below.');
        return false;
    }

    if (mediaRecorder) {
        voiceInputAvailable = true;
        return true;
    }

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        });

        mediaRecorder.addEventListener('stop', async () => {
            try {
                if (audioChunks.length === 0) {
                    setIdleStatus();
                    return;
                }

                statusText.textContent = 'Transcribing your voice...';
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
                const transcript = await transcribeAudio(audioBlob);

                if (!transcript) {
                    aiResponseDisplay.textContent = 'I could not hear any speech. Please try again or use text input.';
                    setIdleStatus();
                    return;
                }

                userTranscriptDisplay.textContent = transcript;
                await processUserInput(transcript);
            } catch (error) {
                console.error('Transcription error:', error);
                aiResponseDisplay.textContent = 'Voice transcription failed. Please use the text input below.';
                setIdleStatus();
            }
        });

        voiceInputAvailable = true;
        return true;
    } catch (error) {
        console.error('Microphone access error:', error);
        setVoiceUnavailable('Microphone access failed. Use text input below.');
        return false;
    }
}

async function transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await apiFetch('/speech/transcribe', {
        method: 'POST',
        body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Transcription failed');
    }

    return String(data.text || '').trim();
}

function startRecordingUi() {
    isRecording = true;
    listenBtn.classList.add('recording');
    visualizer.parentElement.classList.add('listening');
    btnText.textContent = 'Stop Recording';
    statusText.textContent = 'Recording your voice...';
}

function stopRecordingUi() {
    isRecording = false;
    listenBtn.classList.remove('recording');
    visualizer.parentElement.classList.remove('listening');
    btnText.textContent = 'Start Listening';
}

listenBtn.addEventListener('click', async () => {
    if (!authToken) return;

    const ready = await ensureRecorderReady();
    if (!ready || !mediaRecorder) return;

    if (isRecording) {
        mediaRecorder.stop();
        stopRecordingUi();
        return;
    }

    audioChunks = [];
    mediaRecorder.start();
    startRecordingUi();
});

logoutBtn.addEventListener('click', () => {
    if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
    }

    clearSession();
    redirectToLogin();
});

textForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = textInput.value.trim();
    if (!text) return;

    userTranscriptDisplay.textContent = text;
    textInput.value = '';
    await processUserInput(text);
});

async function processUserInput(text) {
    statusText.textContent = 'Thinking...';
    aiResponseDisplay.textContent = '...';
    sendBtn.disabled = true;
    listenBtn.disabled = true;

    try {
        const response = await apiFetch('/agent', {
            method: 'POST',
            body: JSON.stringify({ text }),
        });

        const data = await response.json();
        const aiText = data.response || 'No response received.';

        aiResponseDisplay.textContent = aiText;
        speak(aiText);
    } catch (error) {
        console.error('API Error:', error);
        if (error.message !== 'Unauthorized') {
            aiResponseDisplay.textContent = "Error: Couldn't connect to server.";
            speak("I'm sorry, I'm having trouble connecting to the server.");
        }
    } finally {
        sendBtn.disabled = false;
        listenBtn.disabled = !authToken || !voiceInputAvailable;
        setIdleStatus();
    }
}

function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find((voice) => voice.name.includes('Google') && voice.lang === 'en-US') || voices[0];

        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.pitch = 1;
        utterance.rate = 1;
        window.speechSynthesis.speak(utterance);
    }
}

window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

restoreSession();

const AUTH_TOKEN_KEY = 'voice_agent_token';
const AUTH_USER_KEY = 'voice_agent_user';

const form = document.getElementById('auth-form');
const submitBtn = document.getElementById('submit-btn');
const authStatus = document.getElementById('auth-status');
const mode = document.body.dataset.authMode;

function redirectToApp() {
    window.location.href = '/';
}

async function restoreSession() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    try {
        const response = await fetch('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
            redirectToApp();
        }
    } catch (error) {
        console.error('Session restore failed:', error);
    }
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitBtn.disabled = true;
    authStatus.textContent = mode === 'signup' ? 'Creating your account...' : 'Signing you in...';

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    const endpoint = mode === 'signup' ? '/auth/signup' : '/auth/login';

    if (mode === 'signup' && password !== confirmPassword) {
        authStatus.textContent = 'Passwords do not match';
        submitBtn.disabled = false;
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, confirmPassword }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Authentication failed');
        }

        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(AUTH_USER_KEY, data.user.email);
        redirectToApp();
    } catch (error) {
        authStatus.textContent = error.message || 'Authentication failed';
    } finally {
        submitBtn.disabled = false;
    }
});

restoreSession();

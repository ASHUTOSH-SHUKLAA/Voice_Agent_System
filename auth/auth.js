const express = require('express');
const bcrypt = require('bcryptjs');
const { getRedisClient } = require('../lib/redis');
const { extractToken, signToken, verifyToken } = require('../middleware/auth');

const router = express.Router();
const USER_KEY_PREFIX = `${process.env.REDIS_KEY_PREFIX || 'voice-agent'}:user`;

function userKey(email) {
  return `${USER_KEY_PREFIX}:${String(email).toLowerCase()}`;
}

function sanitizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validateCredentials(email, password) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address';
  }

  if (password.length < 6) {
    return 'Password must be at least 6 characters long';
  }

  return null;
}

async function getUserByEmail(email) {
  const raw = await getRedisClient().get(userKey(email));
  return raw ? JSON.parse(raw) : null;
}

async function createUser(email, password) {
  const normalizedEmail = sanitizeEmail(email);
  const existingUser = await getUserByEmail(normalizedEmail);
  if (existingUser) {
    return { error: 'An account with this email already exists' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  await getRedisClient().set(userKey(normalizedEmail), JSON.stringify(user));
  return { user };
}

router.post('/signup', async (req, res, next) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');
    const validationError = validateCredentials(email, password);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const result = await createUser(email, password);
    if (result.error) {
      return res.status(409).json({ error: result.error });
    }

    const token = signToken({ email: result.user.email });
    return res.status(201).json({
      success: true,
      token,
      user: { email: result.user.email },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ email: user.email });
    return res.json({
      success: true,
      token,
      user: { email: user.email },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required' });
  }

  try {
    const user = verifyToken(token);
    return res.json({ authenticated: true, user: { email: user.email } });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;

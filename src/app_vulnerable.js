'use strict';

require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { csrfSync } = require('csrf-sync');
const crypto = require('node:crypto');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true';

if (!JWT_SECRET || JWT_SECRET.length < 64 || !ADMIN_PASSWORD_HASH) {
  throw new Error('Configuracion segura incompleta');
}

const sessions = new Map();

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const cookieOptions = {
  httpOnly: true,
  secure: HTTPS_ENABLED,
  sameSite: 'strict',
  path: '/',
  maxAge: 15 * 60 * 1000
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false
});

function authenticate(req, res, next) {
  const token = req.cookies.session_token;

  if (!token) {
    return res.status(401).json({ error: 'Sesion requerida' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'eva03',
      audience: 'eva03-api'
    });

    if (!sessions.has(payload.jti)) {
      return res.status(401).json({ error: 'Sesion revocada' });
    }

    req.user = payload;
    req.session = sessions.get(payload.jti);
    req.sessionId = payload.jti;
    next();
  } catch {
    return res.status(401).json({ error: 'Sesion invalida' });
  }
}

const { generateToken, csrfSynchronisedProtection } = csrfSync({
  getTokenFromState: req => req.session.csrfToken,
  storeTokenInState: (req, token) => {
    req.session.csrfToken = token;
  },
  getTokenFromRequest: req => req.headers['x-csrf-token']
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Datos invalidos' });
  }

  const validPassword = await bcrypt.compare(
    password,
    ADMIN_PASSWORD_HASH
  );

  if (username !== 'admin' || !validPassword) {
    return res.status(401).json({ error: 'Credenciales invalidas' });
  }

  const sessionId = crypto.randomUUID();

  const token = jwt.sign(
    { username: 'admin', role: 'administrator' },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '15m',
      issuer: 'eva03',
      audience: 'eva03-api',
      jwtid: sessionId
    }
  );

  sessions.set(sessionId, { csrfToken: undefined });
  res.cookie('session_token', token, cookieOptions);

  return res.json({ message: 'Login exitoso' });
});

app.get('/api/csrf-token', authenticate, (req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json({ csrfToken: generateToken(req) });
});

app.post(
  '/api/transfer',
  authenticate,
  csrfSynchronisedProtection,
  (req, res) => {
    const { amount, recipient } = req.body || {};

    if (
      typeof amount !== 'number' ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 10000 ||
      Math.round(amount * 100) !== amount * 100 ||
      typeof recipient !== 'string' ||
      !/^[a-zA-Z0-9_-]{3,40}$/.test(recipient)
    ) {
      return res.status(400).json({
        error: 'Monto o destinatario invalido'
      });
    }

    return res.json({
      status: 'SUCCESS',
      message: 'Transferencia simulada realizada',
      amount,
      recipient
    });
  }
);

app.post('/api/logout', authenticate, csrfSynchronisedProtection, (req, res) => {
  sessions.delete(req.sessionId);
  res.clearCookie('session_token', {
    httpOnly: true,
    secure: HTTPS_ENABLED,
    sameSite: 'strict',
    path: '/'
  });
  return res.json({ message: 'Sesion cerrada' });
});

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Token CSRF invalido' });
  }
  console.error('Error interno de la aplicacion');
  return res.status(500).json({ error: 'Error interno' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`EVA03 segura activa en puerto ${PORT}`);
});

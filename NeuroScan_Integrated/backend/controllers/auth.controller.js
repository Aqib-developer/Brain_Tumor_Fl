import bcrypt from 'bcrypt';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import pool from '../db/db.js';
import { emailIsConfigured, sendOtpEmail } from '../services/emailService.js';

const CODE_MINUTES = 10;
const SEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function validEmail(email) {
  return email.length <= 254 && EMAIL_RE.test(email);
}
function validPassword(password) {
  return typeof password === 'string' && password.length >= 8 && Buffer.byteLength(password, 'utf8') <= 72;
}
function otpHash(email, purpose, code) {
  const secret = process.env.OTP_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 24) throw new Error('Configure a long OTP_SECRET in backend/.env');
  return createHmac('sha256', secret).update(`${purpose}:${email}:${code}`).digest('hex');
}
function matchesOtp(stored, email, purpose, code) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
  const one = Buffer.from(stored, 'hex');
  const two = Buffer.from(otpHash(email, purpose, code), 'hex');
  return one.length === two.length && timingSafeEqual(one, two);
}
function handledError(res, error, action) {
  console.error(`${action}:`, error.message);
  if (['Registration', 'Resend verification', 'Password reset request'].includes(action) && !emailIsConfigured()) {
    return res.status(503).json({ message: 'Email delivery is not configured on the server. Contact the administrator.' });
  }
  return res.status(500).json({ message: `${action} failed. Please try again later.` });
}

async function issueCode(email, purpose, payload = {}) {
  if (!emailIsConfigured()) throw new Error('SMTP not configured');
  const prior = await pool.query(
    'SELECT last_sent_at FROM auth_challenges WHERE email=$1 AND purpose=$2',
    [email, purpose],
  );
  if (prior.rowCount) {
    const elapsed = (Date.now() - new Date(prior.rows[0].last_sent_at).getTime()) / 1000;
    if (elapsed < SEND_COOLDOWN_SECONDS) {
      return { cooldown: Math.ceil(SEND_COOLDOWN_SECONDS - elapsed) };
    }
  }
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const hash = otpHash(email, purpose, code);
  await pool.query(
    `INSERT INTO auth_challenges (email, purpose, code_hash, payload, expires_at, last_sent_at, attempts)
     VALUES ($1, $2, $3, $4::jsonb, NOW() + INTERVAL '10 minutes', NOW(), 0)
     ON CONFLICT (email, purpose) DO UPDATE SET
       code_hash=EXCLUDED.code_hash, payload=EXCLUDED.payload,
       expires_at=EXCLUDED.expires_at, last_sent_at=NOW(), attempts=0`,
    [email, purpose, hash, JSON.stringify(payload)],
  );
  try {
    await sendOtpEmail({ to: email, code, purpose });
  } catch (error) {
    // The just-created challenge is unusable if its email never arrived.
    await pool.query('DELETE FROM auth_challenges WHERE email=$1 AND purpose=$2 AND code_hash=$3', [email, purpose, hash]);
    throw error;
  }
  return { sent: true };
}

async function checkCodeForUpdate(client, email, purpose, code) {
  const result = await client.query(
    'SELECT * FROM auth_challenges WHERE email=$1 AND purpose=$2 FOR UPDATE',
    [email, purpose],
  );
  const challenge = result.rows[0];
  if (!challenge) return { ok: false, message: 'No active code. Request a new code.' };
  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    return { ok: false, message: 'Code expired. Request a new code.' };
  }
  if (challenge.attempts >= MAX_ATTEMPTS) {
    return { ok: false, message: 'Too many attempts. Wait and request a new code.' };
  }
  if (!matchesOtp(challenge.code_hash, email, purpose, code)) {
    await client.query(
      'UPDATE auth_challenges SET attempts=attempts+1 WHERE email=$1 AND purpose=$2',
      [email, purpose],
    );
    return { ok: false, message: 'Incorrect code. Please try again.' };
  }
  return { ok: true, challenge };
}

export async function registerUser(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;
  if (!name || name.length > 100 || !validEmail(email) || !validPassword(password)) {
    return res.status(400).json({ message: 'Enter a valid name, email address and password (8–72 bytes).' });
  }
  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE lower(email)=$1', [email]);
    if (exists.rowCount) return res.status(409).json({ message: 'This email is already registered. Sign in or reset your password.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await issueCode(email, 'register', { name, password_hash: passwordHash });
    if (result.cooldown) return res.status(429).json({ message: `Please wait ${result.cooldown} seconds before requesting another code.` });
    return res.status(202).json({ message: 'We sent a six-digit verification code to your email.', email, verification_required: true });
  } catch (error) { return handledError(res, error, 'Registration'); }
}

export async function resendVerification(req, res) {
  const email = cleanEmail(req.body?.email);
  if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  try {
    const pending = await pool.query(
      'SELECT payload FROM auth_challenges WHERE email=$1 AND purpose=$2', [email, 'register'],
    );
    if (!pending.rowCount) return res.status(400).json({ message: 'No pending registration. Please sign up again.' });
    const result = await issueCode(email, 'register', pending.rows[0].payload);
    if (result.cooldown) return res.status(429).json({ message: `Please wait ${result.cooldown} seconds before requesting another code.` });
    return res.json({ message: 'A new verification code has been sent.' });
  } catch (error) { return handledError(res, error, 'Resend verification'); }
}

export async function verifyEmail(req, res) {
  const email = cleanEmail(req.body?.email);
  const code = req.body?.code;
  if (!validEmail(email) || typeof code !== 'string') return res.status(400).json({ message: 'Enter your email and six-digit code.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await checkCodeForUpdate(client, email, 'register', code);
    if (!check.ok) {
      await client.query('COMMIT');
      return res.status(400).json({ message: check.message });
    }
    const { name, password_hash } = check.challenge.payload;
    if (typeof name !== 'string' || typeof password_hash !== 'string') throw new Error('Invalid signup payload');
    const created = await client.query(
      `INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3)
       RETURNING id, name, email, created_at`,
      [name, email, password_hash],
    );
    await client.query('DELETE FROM auth_challenges WHERE email=$1 AND purpose=$2', [email, 'register']);
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Email verified. Your account is ready—please sign in.', user: created.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ message: 'This email is already registered.' });
    return handledError(res, error, 'Email verification');
  } finally { client.release(); }
}

export async function requestPasswordReset(req, res) {
  const email = cleanEmail(req.body?.email);
  if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  const message = 'If an account exists for this address, a six-digit reset code will be emailed.';
  try {
    const exists = await pool.query('SELECT 1 FROM users WHERE lower(email)=$1', [email]);
    if (exists.rowCount) {
      const result = await issueCode(email, 'reset');
      if (result.cooldown) return res.status(429).json({ message: `Please wait ${result.cooldown} seconds before requesting another code.` });
    }
    return res.json({ message });
  } catch (error) { return handledError(res, error, 'Password reset request'); }
}

export async function resetPassword(req, res) {
  const email = cleanEmail(req.body?.email);
  const code = req.body?.code;
  const password = req.body?.new_password;
  if (!validEmail(email) || typeof code !== 'string' || !validPassword(password)) {
    return res.status(400).json({ message: 'Enter a valid email, six-digit code, and new password (8–72 bytes).' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await checkCodeForUpdate(client, email, 'reset', code);
    if (!check.ok) {
      await client.query('COMMIT');
      return res.status(400).json({ message: check.message });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await client.query(
      'UPDATE users SET password_hash=$1, updated_at=NOW() WHERE lower(email)=$2 RETURNING id',
      [passwordHash, email],
    );
    if (!user.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid or expired reset request.' });
    }
    await client.query('DELETE FROM auth_challenges WHERE email=$1 AND purpose=$2', [email, 'reset']);
    // Log out other sessions after the password is changed.
    await client.query(`DELETE FROM "session" WHERE sess::jsonb->>'userId'=$1`, [String(user.rows[0].id)]);
    await client.query('COMMIT');
    return res.json({ message: 'Password changed successfully. Sign in with your new password.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return handledError(res, error, 'Password change');
  } finally { client.release(); }
}

export async function loginUser(req, res) {
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;
  if (!validEmail(email) || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email and password are required.' });
  }
  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE lower(email)=$1', [email],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: 'Unable to start a login session.' });
      req.session.userId = user.id;
      req.session.save((saveErr) => {
        if (saveErr) return res.status(500).json({ message: 'Unable to save your login session.' });
        return res.json({ message: 'Login successful!', user: { id: user.id, name: user.name, email: user.email } });
      });
    });
  } catch (error) { return handledError(res, error, 'Login'); }
}

import express from 'express';
import {
  registerUser,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  loginUser,
} from '../controllers/auth.controller.js';

const router = express.Router();

// Simple per-IP development throttle; use a shared rate-limit store for production.
const buckets = new Map();
function limit(max, minutes) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now > bucket.until) {
      buckets.set(key, { count: 1, until: now + minutes * 60 * 1000 });
      return next();
    }
    if (bucket.count >= max) return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    bucket.count++;
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets) if (now > value.until) buckets.delete(key);
}, 30 * 60 * 1000).unref();

router.post('/register', limit(8, 15), registerUser);
router.post('/verify-email', limit(30, 15), verifyEmail);
router.post('/resend-verification', limit(8, 15), resendVerification);
router.post('/request-password-reset', limit(8, 15), requestPasswordReset);
router.post('/reset-password', limit(30, 15), resetPassword);
router.post('/login', limit(30, 15), loginUser);

router.post('/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ message: 'Unable to log out. Please try again.' });
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully.' });
  });
});

export default router;

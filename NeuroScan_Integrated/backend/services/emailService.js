import nodemailer from 'nodemailer';

export function emailIsConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendOtpEmail({ to, code, purpose }) {
  if (!emailIsConfigured()) {
    throw new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.');
  }
  const port = Number(process.env.SMTP_PORT || '465');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const subject = purpose === 'register'
    ? 'NeuroScan — Verify your email'
    : 'NeuroScan — Reset your password';
  const action = purpose === 'register' ? 'finish creating your account' : 'reset your password';
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: `Your NeuroScan verification code is ${code}. Use this code to ${action}. It expires in 10 minutes. If you did not request this, ignore this email. Never share this code.`,
  });
}

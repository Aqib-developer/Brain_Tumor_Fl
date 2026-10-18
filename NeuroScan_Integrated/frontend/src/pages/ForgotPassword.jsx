import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import { requestPasswordReset, resetPassword } from '../services/authService.js';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [requested, setRequested] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const result = await requestPasswordReset(email.trim());
      setRequested(true); setMessage(result.message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function complete(e) {
    e.preventDefault(); setError(''); setBusy(true);
    if (password !== confirm) { setBusy(false); return setError('Passwords do not match.'); }
    try {
      await resetPassword(email.trim(), code.trim(), password);
      navigate('/login', { replace: true, state: { message: 'Your password was reset. Sign in with the new password.' } });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <AuthShell>
    <div className="auth-form-head"><span className="eyebrow"><KeyRound size={14}/> ACCOUNT RECOVERY</span>
      <h2>Reset your password</h2>
      <p>{requested ? 'Enter the email code and choose a new password.' : 'We will email a six-digit code to your registered address.'}</p>
    </div>
    {error && <div className="inline-alert" role="alert">{error}</div>}
    {message && <div className="inline-success" role="status">{message}</div>}
    <form className="form-stack" onSubmit={requested ? complete : send}>
      <label className="field"><span>Email address</span>
        <input type="email" placeholder="you@example.com" value={email} disabled={requested}
          onChange={e => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      {requested && <>
        <label className="field"><span>Six-digit verification code</span>
          <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code"
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
        </label>
        <label className="field"><span>New password</span>
          <input type="password" minLength="8" value={password} autoComplete="new-password"
            onChange={e => setPassword(e.target.value)} placeholder="At least eight characters" required />
        </label>
        <label className="field"><span>Confirm new password</span>
          <input type="password" minLength="8" value={confirm} autoComplete="new-password"
            onChange={e => setConfirm(e.target.value)} required />
        </label>
      </>}
      <button className="btn btn-primary full-width" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : requested ? 'Reset password' : 'Send reset code'} <ArrowRight size={17}/>
      </button>
    </form>
    {requested && <p className="auth-switch"><button type="button" className="subtle-link" onClick={() => { setRequested(false); setMessage(''); setCode(''); }}>Request another code</button></p>}
    <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
  </AuthShell>;
}

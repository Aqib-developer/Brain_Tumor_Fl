import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, MailCheck } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import { verifyEmail, resendVerification } from '../services/authService.js';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyEmail(email.trim(), code.trim());
      navigate('/login', { replace: true, state: { message: 'Email verified. Account created successfully. Please sign in.' } });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function resend() {
    setError(''); setMessage(''); setLoading(true);
    try { const result = await resendVerification(email.trim()); setMessage(result.message); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <AuthShell isRegister>
    <div className="auth-form-head"><span className="eyebrow"><MailCheck size={14}/> EMAIL VERIFICATION</span>
      <h2>Verify your email address</h2>
      <p>Enter the six-digit code sent to your inbox. Codes expire after 10 minutes.</p>
    </div>
    {error && <div className="inline-alert" role="alert">{error}</div>}
    {message && <div className="inline-success" role="status">{message}</div>}
    <form className="form-stack" onSubmit={submit}>
      <label className="field"><span>Email address</span>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
      </label>
      <label className="field"><span>Six-digit email code</span>
        <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" autoComplete="one-time-code"
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter six-digit code" required />
      </label>
      <button className="btn btn-primary full-width" type="submit" disabled={loading}>
        {loading ? 'Verifying…' : 'Verify and finish registration'} <ArrowRight size={17}/>
      </button>
    </form>
    <p className="auth-switch"><button type="button" className="subtle-link" disabled={loading} onClick={resend}>Resend verification code</button></p>
    <p className="auth-switch">Need to start over? <Link to="/register">Return to registration</Link>.</p>
  </AuthShell>;
}

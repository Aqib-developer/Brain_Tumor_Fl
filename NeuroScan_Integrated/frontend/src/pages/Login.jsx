import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import { loginUser } from '../services/authService.js';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { await loginUser(form.email.trim(), form.password); navigate('/dashboard', { replace: true }); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <AuthShell>
    <div className="auth-form-head"><span className="eyebrow"><LockKeyhole size={14}/> ACCOUNT ACCESS</span>
      <h2>Sign in to your workspace</h2>
      <p>Use your registered account to manage MRI research analyses.</p>
    </div>
    {location.state?.message && <div className="inline-success" role="status">{location.state.message}</div>}
    {error && <div className="inline-alert" role="alert">{error}</div>}
    <form className="form-stack" onSubmit={submit} autoComplete="off">
      <label className="field"><span>Email address</span>
        <input type="email" placeholder="you@example.com" value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="off" required />
      </label>
      <label className="field"><span>Password</span>
        <div className="field-with-action">
          <input type={show ? 'text' : 'password'} placeholder="Enter your password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="current-password" required />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={18}/> : <Eye size={18}/>}
          </button>
        </div>
      </label>
      <p style={{ margin: '-2px 0 0', textAlign: 'right' }}>
        <Link className="subtle-link" to="/forgot-password">Forgot password?</Link>
      </p>
      <button className="btn btn-primary full-width" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'} <ArrowRight size={17}/>
      </button>
    </form>
    <p className="auth-switch">New to NeuroScan? <Link to="/register">Create an account</Link></p>
    <p className="auth-disclaimer">Your account is validated by the Node.js backend. This is not a demo login.</p>
  </AuthShell>;
}

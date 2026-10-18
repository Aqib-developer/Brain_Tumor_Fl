import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, UserPlus } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import { registerUser } from '../services/authService.js';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (form.password.length < 8) return setError('Use at least eight characters for your password.');
    setLoading(true);
    try {
      await registerUser(form.name.trim(), form.email.trim(), form.password);
      navigate('/verify-email', { replace: true, state: { email: form.email.trim().toLowerCase() } });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  return <AuthShell isRegister>
    <div className="auth-form-head"><span className="eyebrow"><UserPlus size={14}/> CREATE AN ACCOUNT</span>
      <h2>Join the NeuroScan workspace</h2>
      <p>Create your research account and verify your email with a six-digit code.</p>
    </div>
    {error && <div className="inline-alert" role="alert">{error}</div>}
    <form className="form-stack" onSubmit={submit} autoComplete="off">
      <label className="field"><span>Full name</span>
        <input type="text" maxLength="100" placeholder="Your full name" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="name" required />
      </label>
      <label className="field"><span>Email address</span>
        <input type="email" placeholder="you@example.com" value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="off" required />
      </label>
      <label className="field"><span>Password <small>At least 8 characters</small></span>
        <div className="field-with-action">
          <input type={show ? 'text' : 'password'} minLength="8" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password" placeholder="Create a password" required />
          <button type="button" aria-label={show ? 'Hide password' : 'Show password'}
            onClick={() => setShow(!show)}>{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
        </div>
      </label>
      <label className="field"><span>Confirm password</span>
        <input type={show ? 'text' : 'password'} minLength="8" value={form.confirm}
          onChange={e => setForm({ ...form, confirm: e.target.value })}
          autoComplete="new-password" placeholder="Repeat password" required />
      </label>
      <button className="btn btn-primary full-width" type="submit" disabled={loading}>
        {loading ? 'Sending verification code…' : 'Create account & send code'} <ArrowRight size={17}/>
      </button>
    </form>
    <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
  </AuthShell>;
}

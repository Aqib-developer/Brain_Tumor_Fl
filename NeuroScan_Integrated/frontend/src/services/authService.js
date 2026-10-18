const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  let data;
  try { data = await response.json(); }
  catch { throw new Error('API unavailable or returned an invalid response. Is the backend running?'); }
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
const post = (endpoint, body) => request(`/auth${endpoint}`, {
  method: 'POST', body: JSON.stringify(body),
});
export const registerUser = (name, email, password) => post('/register', { name, email, password });
export const verifyEmail = (email, code) => post('/verify-email', { email, code });
export const resendVerification = (email) => post('/resend-verification', { email });
export const requestPasswordReset = (email) => post('/request-password-reset', { email });
export const resetPassword = (email, code, newPassword) => post('/reset-password', { email, code, new_password: newPassword });
export const loginUser = (email, password) => post('/login', { email, password });
export const getDashboard = () => request('/dashboard');
export const logoutUser = () => post('/logout', {});

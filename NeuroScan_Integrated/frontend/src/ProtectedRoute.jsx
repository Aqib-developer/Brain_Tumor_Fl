import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getDashboard } from './services/authService.js';

export default function ProtectedRoute() {
  const demo = import.meta.env.VITE_DEMO_MODE === 'true';
  const [status, setStatus] = useState({ loading: !demo, user: demo ? { id: 'demo-review', name: 'Demo Reviewer', email: 'review@neuroscan.demo' } : null });
  useEffect(() => {
    if (demo) return;
    let active = true;
    getDashboard()
      .then(data => { if (active) setStatus({ loading: false, user: data.user }); })
      .catch(() => { if (active) setStatus({ loading: false, user: null }); });
    return () => { active = false; };
  }, [demo]);

  if (status.loading) return <div className="loading-page" role="status"><span className="spinner" /> Checking your session...</div>;
  if (!status.user) return <Navigate to="/login" replace />;
  return <Outlet context={{ user: status.user }} />;
}

import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { LayoutDashboard, ScanLine, History, ChartColumnIncreasing, BookOpen, Settings, LogOut, Menu, X, UserRound, ArrowRight, FlaskConical, ShieldCheck } from 'lucide-react';
import Brand from './Brand.jsx';
import { logoutUser } from '../services/authService.js';
const menu = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/analyze', label: 'MRI Analysis', icon: ScanLine },
  { path: '/history', label: 'Prediction History', icon: History },
  { path: '/research', label: 'Model Research', icon: ChartColumnIncreasing },
  { path: '/about', label: 'About / Methodology', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
];
export default function AppLayout() {
  const { user } = useOutletContext();
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const active = menu.find(m => location.pathname.startsWith(m.path));
  async function logout() {
    if (isDemo) { navigate('/'); return; }
    try { await logoutUser(); navigate('/login', { replace: true, state: { message: 'You have logged out.' } }); }
    catch (e) { setError(e.message); }
  }
  return <div className="workspace-shell">
    {open && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`workspace-sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-brand"><Brand dark to="/dashboard" /><button className="mobile-only icon-button" aria-label="Close menu" onClick={() => setOpen(false)}><X size={20}/></button></div>
      <div className="sidebar-group-title">WORKSPACE</div>
      <nav aria-label="Main navigation" className="sidebar-menu">{menu.map(({path,label,icon:Icon}) => <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({isActive})=>`sidebar-link ${isActive?'is-active':''}`}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-foot"><div className="sidebar-notice"><FlaskConical size={17}/><span>Research prototype<br/><small>Offline trained models</small></span></div><button className="sidebar-link sidebar-logout" onClick={logout}><LogOut size={18}/> Logout</button></div>
    </aside>
    <div className="workspace-main">
      <header className="workspace-header"><div className="workspace-heading"><button className="mobile-only icon-button" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={22}/></button><div><div className="breadcrumb">WORKSPACE / {active?.label || 'Prediction Result'}</div><strong>{active?.label || 'Analysis Result'}</strong></div></div><div className="header-right"><span className="header-pill"><ShieldCheck size={14}/> {isDemo ? 'FRONTEND REVIEW MODE' : 'Research prototype'}</span><span className="user-mini"><UserRound size={17}/><span>{user.name}</span></span></div></header>
      {error && <div className="inline-alert" role="alert">{error}</div>}
      <main className="workspace-content"><Outlet context={{user}} /></main>
      <footer className="workspace-footer">NeuroScan • Academic research prototype <span>Not a medical diagnostic device</span></footer>
    </div>
  </div>;
}
export function PageHeading({ eyebrow, title, description, action }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>; }
export function SectionHeading({title,subtitle,action}) {return <div className="section-heading"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>;}
export function ActionLink({to,children}){return <NavLink className="btn btn-primary" to={to}>{children}<ArrowRight size={16}/></NavLink>;}

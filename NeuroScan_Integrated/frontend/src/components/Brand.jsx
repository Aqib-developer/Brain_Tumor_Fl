import { Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
export default function Brand({ dark = false, to = '/' }) {
  return <Link to={to} className={`ns-brand ${dark ? 'ns-brand-dark' : ''}`}>
    <span className="ns-mark"><BrainCircuit size={24} strokeWidth={1.9} /></span>
    <span className="ns-brand-type"><strong>NeuroScan</strong><small>FL · MRI RESEARCH</small></span>
  </Link>;
}

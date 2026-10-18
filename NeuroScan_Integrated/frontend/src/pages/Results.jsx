import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useOutletContext } from 'react-router-dom';
import { ArrowLeft, History, ScanLine, AlertTriangle, BrainCircuit, Info } from 'lucide-react';
import { CLASSES, getSavedRecords, getTransientResult, saveRecord } from '../lib/demo.js';
import { fetchPrediction } from '../services/predictionService.js';
import { PageHeading } from '../components/AppLayout.jsx';
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const fmt = value => new Date(value).toLocaleString();
export default function Results() {
  const {id} = useParams();
  const {state} = useLocation();
  const {user} = useOutletContext();
  const [record, setRecord] = useState(()=>state?.result || (DEMO ? getTransientResult(id) || getSavedRecords(user.id).find(x=>x.id===id) : null));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(()=>DEMO && getSavedRecords(user.id).some(x=>x.id===id));
  useEffect(()=>{
    if (DEMO || (state?.result && state.result.id === id)) return;
    let active = true;
    fetchPrediction(id).then(x=>{if(active)setRecord(x);}).catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;};
  },[id,state]);
  const preview = state?.imageUrl || (DEMO ? getTransientResult(id)?.imageUrl : null);
  if (!record) return <div className="surface-card notfound"><Info size={32}/><h1>{error?'Result unavailable':'Loading prediction…'}</h1><p>{error||'Loading saved result from PostgreSQL.'}</p><Link className="btn btn-primary" to="/history">View history</Link></div>;
  const classScore = Number(record.scores?.[record.classIndex ?? CLASSES.indexOf(record.className)] || 0);
  function saveDemo() { saveRecord(user.id,record); setSaved(true); }
  return <>
    <PageHeading eyebrow={DEMO?'DEMO ANALYSIS':'SAVED PYTORCH INFERENCE'} title="MRI Inference Analysis Report" description={DEMO?'Illustrative result — not produced by a trained model.':'Real model output saved to PostgreSQL. The original MRI image itself is not stored.'} action={<Link className="btn btn-secondary" to="/analyze"><ArrowLeft size={16}/> New Analysis</Link>}/>
    {DEMO && <div className="demo-alert"><AlertTriangle size={19}/><div><strong>Simulated result</strong><p>This classification is not based on your uploaded image.</p></div></div>}
    <div className="results-grid"><section className="surface-card"><div className="section-heading"><div><h2>Uploaded MRI</h2><p>Temporary browser preview only; no image file stored in history</p></div><ScanLine size={20}/></div><div className="result-image">{preview?<img src={preview} alt="MRI preview"/>:<div><ScanLine size={45}/><p>Preview is not retained after refresh</p></div>}</div><div className="model-detail"><span>Analysis ID</span><strong className="mono">{id.slice(0,8)}</strong></div><div className="model-detail"><span>Date</span><strong>{fmt(record.createdAt)}</strong></div><div className="model-detail"><span>Selected model</span><strong>{record.model}</strong></div></section>
    <section className="surface-card"><div className="result-highlight"><div className="highlight-eyebrow"><BrainCircuit size={18}/> {DEMO?'ILLUSTRATIVE RESULT':'PYTORCH CLASSIFICATION'}</div><div className="result-class">{record.className}</div><div className="result-confidence">{classScore.toFixed(2)}% <small>model score</small></div><div className="result-subtext">{DEMO?'Demo values only':'Uncalibrated output probability • research only'}</div></div><div className="section-heading"><div><h2>Four-class score display</h2><p>Class order matches offline DenseNet121 training</p></div></div><div className="score-list">{CLASSES.map((c,i)=><div className="score-item" key={c}><div className="score-label"><strong>{c}</strong><span>{Number(record.scores?.[i]||0).toFixed(2)}%</span></div><div className="score-track"><div className={c===record.className?'score-fill is-strong':'score-fill'} style={{width:`${Math.max(0,Math.min(100,Number(record.scores?.[i]||0)))}%`}}/></div></div>)}</div><div className="action-row">{DEMO?<button className="btn btn-primary" onClick={saveDemo} disabled={saved}>{saved?'Saved demo record':'Save demo record'}</button>:<span className="chip">✓ Saved automatically to PostgreSQL</span>}<Link className="btn btn-secondary" to="/history"><History size={16}/> View history</Link></div></section></div><div className="safety-line"><AlertTriangle size={17}/> Experimental research prototype. Not medical advice or a clinical diagnosis.</div>
  </>;
}

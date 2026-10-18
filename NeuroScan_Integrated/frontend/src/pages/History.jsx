import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { History as HistoryIcon, Search, Trash2, ExternalLink, Filter, ScanLine } from 'lucide-react';
import { deleteRecord, getSavedRecords, CLASSES } from '../lib/demo.js';
import { listPredictions, removePrediction } from '../services/predictionService.js';
import { PageHeading } from '../components/AppLayout.jsx';
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
export default function History() {
  const {user} = useOutletContext();
  const [records,setRecords] = useState(()=>DEMO ? getSavedRecords(user.id) : []);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(!DEMO);
  const [search,setSearch] = useState('');
  const [category,setCategory] = useState('ALL');
  const [deleteId,setDeleteId] = useState(null);
  useEffect(()=>{
    if(DEMO)return;
    let active=true;
    listPredictions().then(x=>{if(active)setRecords(x);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  const filtered=useMemo(()=>records.filter(r=>(category==='ALL'||r.className===category)&&[r.id,r.className,r.model].some(x=>String(x).toLowerCase().includes(search.toLowerCase()))),[records,search,category]);
  async function remove() {
    if(!deleteId)return;
    try {if(DEMO)setRecords(deleteRecord(user.id,deleteId)); else {await removePrediction(deleteId);setRecords(rows=>rows.filter(x=>x.id!==deleteId));}setDeleteId(null);}
    catch(e){setError(e.message);setDeleteId(null);}
  }
  return <><PageHeading eyebrow="ANALYSIS ARCHIVE" title="Prediction History" description={DEMO?'Temporary demo records stored in this browser.':'Real DenseNet121 inference results saved for your logged-in account in PostgreSQL.'} action={<Link className="btn btn-primary" to="/analyze"><ScanLine size={16}/> New Analysis</Link>}/>
  {error&&<div role="alert" className="inline-alert">{error}</div>}
  <section className="surface-card"><div className="section-heading"><div><h2>{DEMO?'Saved demo analyses':'Your saved MRI predictions'}</h2><p>{loading?'Loading…':`${filtered.length} record(s) shown`}</p></div></div><div className="history-toolbar"><label className="search-field"><Search size={17}/><input aria-label="Search history" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ID, class, or model" /></label><label className="filter-select"><Filter size={16}/><select aria-label="Filter class" value={category} onChange={e=>setCategory(e.target.value)}><option value="ALL">All classes</option>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></label></div>
  {filtered.length?<div className="table-wrap"><table><thead><tr><th>Analysis ID</th><th>Predicted class</th><th>Model</th><th>Date / time</th><th>Actions</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td className="mono">{r.id.slice(0,8)}</td><td><span className="tag tag-blue">{r.className}{DEMO?' · DEMO':''}</span></td><td>{r.model}</td><td>{new Date(r.createdAt).toLocaleString()}</td><td><div className="row-actions"><Link aria-label="View result" to={`/results/${r.id}`} className="icon-button"><ExternalLink size={17}/></Link><button aria-label="Delete record" onClick={()=>setDeleteId(r.id)} className="icon-button danger-text"><Trash2 size={17}/></button></div></td></tr>)}</tbody></table></div>:<div className="empty-panel"><HistoryIcon size={31}/><strong>{loading?'Loading records':records.length?'No records match':'No predictions saved yet'}</strong><p>Use MRI Analysis to generate your first result.</p><Link className="btn btn-secondary" to="/analyze">Start MRI Analysis</Link></div>}</section>
  {deleteId&&<div className="dialog-backdrop" role="presentation" onClick={()=>setDeleteId(null)}><div className="dialog-card" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={e=>e.stopPropagation()}><Trash2 size={29} className="danger-text"/><h2 id="delete-title">Delete prediction?</h2><p>This removes the saved result metadata. MRI image bytes are not kept.</p><div className="action-row"><button className="btn btn-secondary" onClick={()=>setDeleteId(null)}>Cancel</button><button className="btn btn-danger" onClick={remove}>Delete record</button></div></div></div>}</>;
}

import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Image as ImageIcon, Trash2, BrainCircuit, AlertTriangle, ScanLine, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { MODELS, createSampleResult } from '../lib/demo.js';
import { availableModels, createPrediction } from '../services/predictionService.js';
import { PageHeading } from '../components/AppLayout.jsx';
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
export default function Analyze() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [model, setModel] = useState('IID');
  const [modelOptions, setModelOptions] = useState(DEMO ? MODELS.map(m => ({key:m.value,name:m.name,available:true})) : []);
  const [modelError, setModelError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (DEMO) return;
    let active = true;
    availableModels().then(models => {
      if (!active) return;
      setModelOptions(models);
      const usable = models.filter(m => m.available);
      if (usable.length && !usable.some(m => m.key === model)) setModel(usable[0].key);
    }).catch(e => { if (active) setModelError(e.message); });
    return () => { active = false; };
  }, []);
  const selected = modelOptions.find(m => m.key === model);
  function pick(file) {
    setError('');
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) return setError('Choose a PNG or JPEG image.');
    if (file.size > 10 * 1024 * 1024) return setError('Maximum file size is 10 MB.');
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }
  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null); setPreview('');
    if (input.current) input.current.value = '';
  }
  async function analyze() {
    if (!image || busy || !selected?.available) return;
    setError(''); setBusy(true);
    try {
      if (DEMO) {
        const result = createSampleResult({model: selected.name, imageUrl: preview});
        navigate(`/results/${result.id}`, {state:{result, imageUrl:preview}});
        return;
      }
      const result = await createPrediction(image, model);
      navigate(`/results/${result.id}`, {state:{result, imageUrl:preview}});
    } catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeading eyebrow="REAL MRI INFERENCE" title="Brain MRI Analysis" description="Upload an MRI for inference using your previously trained DenseNet121 checkpoint. No federated training occurs during analysis." />
    {DEMO ? <div className="demo-alert"><AlertTriangle size={19}/><div><strong>Frontend preview mode</strong><p>Demo predictions are not derived from the uploaded image.</p></div></div> : <div className="notice-box"><ShieldCheck size={19}/><div><strong>Real PyTorch inference</strong><p>The MRI is passed to your local FastAPI model and not stored as an image in PostgreSQL. Results are saved as metadata.</p></div></div>}
    {modelError && <div className="inline-alert" role="alert">Inference service: {modelError}</div>}
    <div className="analyze-grid">
      <section className="surface-card">
        <div className="section-heading"><div><h2>1. Upload MRI image</h2><p>PNG or JPEG, up to 10 MB</p></div><ImageIcon size={21}/></div>
        <input hidden type="file" ref={input} accept="image/png,image/jpeg" onChange={e=>pick(e.target.files?.[0])} />
        {!image ? <div role="button" tabIndex={0} className={`upload-area ${drag?'is-drag':''}`} onClick={()=>input.current?.click()} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.current?.click();}}} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);pick(e.dataTransfer.files?.[0]);}}><div className="upload-illustration"><UploadCloud size={37}/></div><strong>Drag & drop your MRI</strong><p>or browse to select a file</p><button className="btn btn-secondary" type="button" onClick={e=>{e.stopPropagation();input.current?.click();}}>Browse files</button><small>Only upload permitted, de-identified research images.</small></div> : <div className="upload-preview"><img src={preview} alt="Selected MRI preview"/><div className="preview-footer"><div><strong>{image.name}</strong><small>{(image.size / 1024).toFixed(1)} KB</small></div><div className="preview-buttons"><button className="icon-button" onClick={()=>input.current?.click()} aria-label="Replace image"><UploadCloud size={19}/></button><button className="icon-button" onClick={clear} aria-label="Remove image"><Trash2 size={19}/></button></div></div></div>}
      </section>
      <section className="surface-card"><div className="section-heading"><div><h2>2. Select saved model</h2><p>Only successfully loaded checkpoints can be selected</p></div><BrainCircuit size={21}/></div>
        <label className="field"><span>Inference model</span><select value={model} onChange={e=>setModel(e.target.value)} disabled={!modelOptions.length}>{modelOptions.length ? modelOptions.map(m=><option key={m.key} value={m.key} disabled={!m.available}>{m.name}{!m.available?' (not loaded)':''}</option>) : <option>Waiting for FastAPI…</option>}</select></label>
        <div className="model-info"><span className="chip"><CheckCircle2 size={14}/> {selected?.available?'Checkpoint loaded':'Not ready'}</span><h3>{selected?.name || 'No available model'}</h3><p>DenseNet121 evaluates a single uploaded MRI using weights learned offline. The displayed probabilities are model outputs, not calibrated diagnostic certainty.</p><div className="model-detail"><span>Output categories</span><strong>4 classes</strong></div><div className="model-detail"><span>Preprocessing</span><strong>224×224 · RGB · ImageNet normalization</strong></div><div className="model-detail"><span>Mode</span><strong>{DEMO?'Preview only':'Real inference'}</strong></div></div>
        <button className="btn btn-primary full-width analyze-button" disabled={!image || busy || !selected?.available} onClick={analyze}>{busy?<><span className="spinner"/> Running DenseNet121…</>:<><ScanLine size={18}/> {DEMO?'Analyze MRI · Demo':'Analyze MRI'}</>}</button>
        {error && <div className="inline-alert" role="alert">{error}</div>}
        <div className="analysis-warning"><ShieldCheck size={16}/><span>Academic research prototype only — not for diagnosis or clinical use.</span></div>
      </section>
    </div>
  </>;
}

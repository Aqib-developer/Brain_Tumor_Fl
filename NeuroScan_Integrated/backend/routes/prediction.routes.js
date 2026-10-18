import express from 'express';
import multer from 'multer';
import pool from '../db/db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();
router.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const FASTAPI_URL = (process.env.FASTAPI_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const NAMES = ['No Tumor', 'Meningioma', 'Glioma', 'Pituitary'];

function asResponse(row) {
  return {
    id: row.id,
    modelKey: row.model_key,
    model: row.display_name,
    classIndex: row.predicted_class,
    className: NAMES[row.predicted_class],
    probability: Number(row.predicted_probability),
    scores: ['no_tumor', 'meningioma', 'glioma', 'pituitary'].map(k => Number(row.class_probabilities[k]) * 100),
    createdAt: row.created_at,
    saved: true,
    isDemo: false,
  };
}

router.get('/models', async (_req, res) => {
  try {
    const response = await fetch(`${FASTAPI_URL}/models`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`FastAPI returned ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ message: 'FastAPI is not reachable on port 8000. Start the inference service.', models: [] });
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please upload an MRI image.' });
  if (!['image/png', 'image/jpeg'].includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Only PNG and JPEG images are supported.' });
  }
  const modelKey = String(req.body.model_key || 'IID').trim().toUpperCase();
  if (!['IID', 'NON_IID', 'CENTRAL'].includes(modelKey)) return res.status(400).json({ message: 'Invalid model selection.' });
  try {
    const registry = await pool.query('SELECT id FROM model_registry WHERE model_key = $1', [modelKey]);
    if (!registry.rows.length) return res.status(400).json({ message: 'Model is not registered in neuroscan_db.' });

    const form = new FormData();
    form.append('model_key', modelKey);
    form.append('image', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname);
    let upstream;
    try {
      upstream = await fetch(`${FASTAPI_URL}/predict`, { method: 'POST', body: form, signal: AbortSignal.timeout(120000) });
    } catch (error) {
      console.error('FastAPI network error:', error.message);
      return res.status(503).json({ message: 'FastAPI inference is unavailable. Check the Python terminal on port 8000.' });
    }
    let prediction;
    try { prediction = await upstream.json(); }
    catch { return res.status(502).json({ message: 'FastAPI returned a non-JSON response.' }); }
    if (!upstream.ok) {
      return res.status(upstream.status >= 500 ? 503 : upstream.status).json({ message: prediction.detail || 'MRI inference failed.' });
    }
    const index = prediction.predicted_class;
    const scores = prediction.class_probabilities;
    const keys = ['no_tumor', 'meningioma', 'glioma', 'pituitary'];
    if (!Number.isInteger(index) || index < 0 || index > 3 ||
        !keys.every(k => typeof scores?.[k] === 'number' && scores[k] >= 0 && scores[k] <= 1)) {
      return res.status(502).json({ message: 'FastAPI prediction format is invalid.' });
    }
    const inserted = await pool.query(
      `INSERT INTO predictions (user_id, model_id, predicted_class, predicted_probability, class_probabilities)
       VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING id`,
      [req.session.userId, registry.rows[0].id, index, scores[keys[index]], JSON.stringify(scores)]
    );
    const saved = await pool.query(
      `SELECT p.*, m.model_key, m.display_name FROM predictions p
       JOIN model_registry m ON m.id = p.model_id WHERE p.id = $1 AND p.user_id = $2`,
      [inserted.rows[0].id, req.session.userId]
    );
    return res.status(201).json({ prediction: asResponse(saved.rows[0]) });
  } catch (error) {
    console.error('Prediction API error:', error.message);
    res.status(500).json({ message: 'Could not complete or save prediction. Check backend logs.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, m.model_key, m.display_name FROM predictions p
       JOIN model_registry m ON m.id = p.model_id
       WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 200`,
      [req.session.userId]
    );
    res.json({ predictions: result.rows.map(asResponse) });
  } catch (error) {
    console.error('History query failed:', error.message);
    res.status(500).json({ message: 'Could not fetch prediction history' });
  }
});

router.get('/:id', async (req, res) => {
  if (!/^[0-9a-fA-F-]{36}$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid prediction ID' });
  try {
    const result = await pool.query(
      `SELECT p.*, m.model_key, m.display_name FROM predictions p
       JOIN model_registry m ON m.id = p.model_id
       WHERE p.id = $1 AND p.user_id = $2`, [req.params.id, req.session.userId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Prediction not found' });
    res.json({ prediction: asResponse(result.rows[0]) });
  } catch (error) {
    console.error('Result query failed:', error.message);
    res.status(500).json({ message: 'Could not fetch prediction result' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!/^[0-9a-fA-F-]{36}$/.test(req.params.id)) return res.status(400).json({ message: 'Invalid prediction ID' });
  try {
    const result = await pool.query('DELETE FROM predictions WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.session.userId]);
    if (!result.rows.length) return res.status(404).json({ message: 'Prediction not found' });
    res.json({ message: 'Prediction deleted', id: result.rows[0].id });
  } catch (error) {
    console.error('Delete failed:', error.message);
    res.status(500).json({ message: 'Could not delete prediction' });
  }
});
export default router;

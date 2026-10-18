import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();
router.use(requireAuth);
// Exact output directory of 07_Model_Evaluation_and_Comparison.ipynb.
const root = fileURLToPath(new URL('../../NeuroScan_ML_Assets/results/federated/', import.meta.url));
const scenarioNames = ['Centralized', 'IID', 'NON_IID_Dirichlet'];
const allowedFiles = new Set([
  'test_confusion_matrix.png', 'test_roc_curves.png',
  'test_classification_report.csv', 'test_confusion_matrix.csv',
  'test_predictions.csv', 'test_metrics.json',
]);
const summaryFiles = new Set([
  'final_model_comparison.png', 'federated_validation_f1_by_round.png',
]);

async function existsFile(filename) {
  try { return (await fs.stat(filename)).isFile(); }
  catch { return false; }
}

router.get('/results', async (_req, res) => {
  const metrics = [];
  const artifacts = [];
  for (const scenario of scenarioNames) {
    const dir = path.join(root, scenario);
    const metricsPath = path.join(dir, 'test_metrics.json');
    if (await existsFile(metricsPath)) {
      try {
        const data = JSON.parse(await fs.readFile(metricsPath, 'utf8'));
        metrics.push({ ...data, scenario });
      } catch (error) {
        console.warn(`Cannot parse ${scenario} metrics: ${error.message}`);
      }
    }
    const confusion_matrix = await existsFile(path.join(dir, 'test_confusion_matrix.png'));
    const roc_curve = await existsFile(path.join(dir, 'test_roc_curves.png'));
    artifacts.push({
      scenario,
      confusion_matrix: confusion_matrix
        ? `/api/research/artifacts/${scenario}/test_confusion_matrix.png` : null,
      roc_curve: roc_curve
        ? `/api/research/artifacts/${scenario}/test_roc_curves.png` : null,
      available: { confusion_matrix, roc_curve },
    });
  }
  const summary = {};
  for (const name of summaryFiles) {
    summary[name] = (await existsFile(path.join(root, name)))
      ? `/api/research/artifacts/Summary/${name}` : null;
  }
  return res.json({
    metrics,
    artifacts,
    summary,
    validation_macro_f1: { IID: 0.9445, NON_IID_Dirichlet: 0.8391 },
  });
});

router.get('/artifacts/:scenario/:filename', async (req, res) => {
  const { scenario, filename } = req.params;
  const isSummary = scenario === 'Summary';
  if (isSummary ? !summaryFiles.has(filename)
    : !scenarioNames.includes(scenario) || !allowedFiles.has(filename)) {
    return res.status(404).json({ message: 'Unknown research artifact.' });
  }
  const fullPath = isSummary ? path.join(root, filename) : path.join(root, scenario, filename);
  try {
    // sendFile streams the exported image bytes unchanged; nothing is generated/fabricated.
    if (!(await existsFile(fullPath))) {
      return res.status(404).json({ message: `Missing exported file: ${scenario}/${filename}` });
    }
    res.setHeader('Cache-Control', 'private, no-store');
    return res.sendFile(fullPath);
  } catch (error) {
    console.error('Research artifact error:', error.message);
    return res.status(500).json({ message: 'Could not read research artifact.' });
  }
});

export default router;

const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
async function checkedFetch(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include' });
  } catch {
    throw new Error('Cannot connect to the NeuroScan API. Is Express running on port 5000?');
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error(`Invalid API response (${response.status}). Check Node.js logs.`); }
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
export async function availableModels() {
  return (await checkedFetch('/predictions/models')).models;
}
export async function createPrediction(file, modelKey) {
  const form = new FormData();
  form.append('image', file);
  form.append('model_key', modelKey);
  return (await checkedFetch('/predictions', { method: 'POST', body: form })).prediction;
}
export async function listPredictions() {
  return (await checkedFetch('/predictions')).predictions;
}
export async function fetchPrediction(id) {
  return (await checkedFetch(`/predictions/${encodeURIComponent(id)}`)).prediction;
}
export async function removePrediction(id) {
  return checkedFetch(`/predictions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
export async function fetchResearch() {
  return checkedFetch('/research/results');
}
export const researchArtifact = (scenario, file) => `${API_URL}/research/artifacts/${scenario}/${file}`;

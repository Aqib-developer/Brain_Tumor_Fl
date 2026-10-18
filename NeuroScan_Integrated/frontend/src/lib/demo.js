// Review-only workflow: NEVER performs medical inference or stores uploaded image bytes.
const sessions = new Map();
const KEY = id => `neuroscan-demo-records-${id}`;
export const MODELS = [
  {value:'IID',name:'Federated IID DenseNet121'},
  {value:'NON_IID',name:'Federated Non-IID DenseNet121'},
  {value:'CENTRAL',name:'Centralized DenseNet121'},
];
export const CLASSES = ['No Tumor','Meningioma','Glioma','Pituitary'];
// These are illustrative demo percentages, NOT classifier results.
const SAMPLE_SCORES = [4, 82, 9, 5];
export function createSampleResult({model, imageUrl}) {
  const record = { id: crypto.randomUUID(), className:'Meningioma', scores:SAMPLE_SCORES, model, createdAt:new Date().toISOString(), isDemo:true };
  sessions.set(record.id,{...record,imageUrl});
  return record;
}
export function getTransientResult(id){return sessions.get(id) || null;}
export function getSavedRecords(userId){
  try { const v=JSON.parse(sessionStorage.getItem(KEY(userId))||'[]');return Array.isArray(v)?v:[]; }
  catch{return []}
}
export function saveRecord(userId,record){
  const safe={id:record.id,className:record.className, scores:record.scores,model:record.model,createdAt:record.createdAt,isDemo:true};
  const data=[safe,...getSavedRecords(userId).filter(x=>x.id!==safe.id)];
  sessionStorage.setItem(KEY(userId),JSON.stringify(data));return data;
}
export function deleteRecord(userId,id){const next=getSavedRecords(userId).filter(r=>r.id!==id);sessionStorage.setItem(KEY(userId),JSON.stringify(next));return next;}

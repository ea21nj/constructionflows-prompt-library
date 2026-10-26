// Site Walk progress, kept only in the visitor's browser.
import { CREW } from './content.js';
import { AUDIT_SECTIONS } from './audit-content.js';

export const STORAGE_KEY = 'wp.sitewalk.v1';
export const OFFICE_UNLOCK = 3;
const QUESTIONS = 3;
const AGENT_IDS = new Set(CREW.map((c) => c.agentId));
const AUDIT_IDS = new Set(AUDIT_SECTIONS.map((s) => s.id));
const AUDIT_QUESTIONS = 5;
const defaultStorage = () => { try { return globalThis.localStorage; } catch { return null; } };

export function createState() {
  return { v: 1, answers: {}, lastTalked: {}, officeSeen: false, audit: {}, reportSaved: false };
}

// Keeps only well-formed answers for known agents so old or tampered data can't break the game.
function clean(raw) {
  if (!raw || raw.v !== 1 || typeof raw.answers !== 'object' || raw.answers === null) return createState();
  const state = createState();
  for (const [id, list] of Object.entries(raw.answers)) {
    if (!AGENT_IDS.has(Number(id)) || !Array.isArray(list)) continue;
    const kept = [];
    for (let i = 0; i < Math.min(list.length, QUESTIONS); i++) {
      if (!Number.isInteger(list[i]) || list[i] < 0 || list[i] > 3) break;
      kept.push(list[i]);
    }
    if (kept.length) state.answers[id] = kept;
  }
  for (const [id, t] of Object.entries(raw.lastTalked || {})) if (state.answers[id] && Number.isFinite(t)) state.lastTalked[id] = t;
  state.officeSeen = raw.officeSeen === true;
  state.reportSaved = raw.reportSaved === true;
  // Site audit answers (added later; older saves simply have none).
  for (const [id, list] of Object.entries(raw.audit || {})) {
    if (!AUDIT_IDS.has(id) || !Array.isArray(list)) continue;
    const kept = [];
    for (let i = 0; i < Math.min(list.length, AUDIT_QUESTIONS); i++) {
      if (!Number.isInteger(list[i]) || list[i] < 0 || list[i] > 3) break;
      kept.push(list[i]);
    }
    if (kept.length) state.audit[id] = kept;
  }
  return state;
}

export function loadState(storage = defaultStorage()) {
  try { return clean(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return createState(); }
}

export function saveState(state, storage = defaultStorage()) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable: progress lasts this visit only */ }
}

export function recordAnswer(state, agentId, qIndex, choice, now = Date.now()) {
  const list = [...(state.answers[agentId] || [])];
  list[qIndex] = choice;
  return { ...state, answers: { ...state.answers, [agentId]: list }, lastTalked: { ...state.lastTalked, [agentId]: now } };
}

export function isComplete(state, agentId) {
  const list = state.answers[agentId] || [];
  return list.length === QUESTIONS && list.every((c) => Number.isInteger(c));
}

export const completedCount = (state) => Object.keys(state.answers).filter((id) => isComplete(state, id)).length;

export const officeOpen = (state) => completedCount(state) >= OFFICE_UNLOCK;

// The visitor downloaded, copied or printed a report.
export const markReportSaved = (state) => (state.reportSaved ? state : { ...state, reportSaved: true });

export function recordAuditAnswer(state, sectionId, qIndex, choice) {
  const list = [...((state.audit || {})[sectionId] || [])];
  list[qIndex] = choice;
  return { ...state, audit: { ...(state.audit || {}), [sectionId]: list } };
}

export function clearAuditSection(state, sectionId) {
  const audit = { ...(state.audit || {}) };
  delete audit[sectionId];
  return { ...state, audit };
}

export const auditCompleted = (state) => Object.values(state.audit || {}).filter((l) => l.length === AUDIT_QUESTIONS && l.every(Number.isInteger)).length;

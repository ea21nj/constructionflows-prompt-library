// Site Walk boot: decides between the game and the classic pages, loads the site, wires the parts.
import './game.css';
import { webglAvailable, currentTier } from './quality.js';

const params = new URLSearchParams(location.search);
const TIERS = ['high', 'medium', 'low'];
const tier = TIERS.includes(params.get('tier')) ? params.get('tier') : currentTier();
import { createEngine } from './engine.js';
import { loadManifest, loadAssets } from './assets.js';
import { buildWorld } from './world.js';
import { createCrew } from './crew.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { isTouchDevice } from './ui/opening.js';
import { createTalk } from './ui/talk.js';
import { createHud } from './ui/hud.js';
import { createMinimap } from './ui/minimap.js';
import { createResults } from './ui/results.js';
import { createAudio } from './audio.js';
import { nextTier } from './perf.js';
import { createJump, landingSpot } from './jump.js';
import { createWheel } from './ui/wheel.js';
import { createSiteMap } from './ui/sitemap.js';
import { AUDIT_SECTIONS } from './audit-content.js';
import { buildCheckpoints } from './world/checkpoints.js';
import { createAuditPanel } from './ui/audit-panel.js';
import { createScorecard } from './ui/scorecard.js';
import { siteScore, scoreChange } from './score.js';
import { createScoreboard } from './ui/scoreboard.js';
import { createLevelBoard } from './ui/level-board.js';
import { gameActive } from './active.js';
import { createBeacons } from './world/beacons.js';
import { zoneAt, starText } from './levels.js';
import { OFFICE } from './content.js';
import { rank } from './scoring.js';
import * as THREE from 'three';
import { CREW } from './content.js';
import { createLoading } from './ui/loading.js';
import { createOpening } from './ui/opening.js';
import { createMenu } from './ui/menu.js';
import { loadState, saveState, createState, completedCount, isComplete, officeOpen, recordAnswer, recordAuditAnswer, clearAuditSection, auditCompleted, markReportSaved, OFFICE_UNLOCK } from './state.js';

const WP = window.WP;
const root = document.getElementById('siteWalk');
const testMode = params.has('test');
const deepLink = /^#(quiz|agents|discovery|about)$/.test(location.hash);
const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const audio = createAudio();

const game = { engine: null, assets: null, state: loadState(), ready: false, started: false };
// True from the moment a jump starts until you land.
Object.defineProperty(game, 'jumping', { get: () => game.jump?.isActive() ?? false });
if (testMode) {
  window.__siteWalk = {
    isReady: () => game.ready, state: () => game.state,
    score: () => siteScore(game.state), beacons: () => game.beacons.count(), zone: () => lastZone,
    crewPositions: () => game.crew.members.map((m) => ({ agentId: m.agentId, name: m.data.name, x: m.pos.x, z: m.pos.z })), fps: () => game.engine?.fps() ?? 0, game,
    teleport(x, z) { game.player.teleport(x, z); },
    // Where an on-screen icon is drawn, in page pixels (for clicking it in tests).
    screenOf(kind, id) {
      const obj = kind === 'crew' ? game.crew.byId(id).plumbob : kind === 'audit' ? game.checkpoints.byId(id).marker : game.world.officeMarker;
      const v = obj.getWorldPosition(new THREE.Vector3()).project(game.engine.camera);
      if (v.z > 1) return null;
      const r = game.engine.renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
    playerPos: () => ({ x: game.player.pos.x, z: game.player.pos.z }),
    // Point the camera along (dx, dz) behind the player, keeping its distance and height.
    faceCamera(dx, dz) {
      const { camera, controls } = game.engine;
      const off = camera.position.clone().sub(controls.target);
      const flat = Math.hypot(off.x, off.z), len = Math.hypot(dx, dz);
      camera.position.set(controls.target.x - (dx / len) * flat, controls.target.y + off.y, controls.target.z - (dz / len) * flat);
    },
  };
}

function fallback() {
  WP.openClassic('agents');
  document.querySelector('[data-site-walk]')?.setAttribute('hidden', '');
  if (!document.querySelector('.sw-fallback-note')) {
    const note = document.createElement('p');
    note.className = 'sw-fallback-note';
    note.textContent = 'Your browser can\'t run the 3D site, so here are the classic pages.';
    document.querySelector('main').prepend(note);
  }
}

const opening = createOpening(root, {
  onStart: () => { game.started = true; document.documentElement.classList.add('sw-playing'); audio.setAmbient(true); },
  onSkip: () => WP.openClassic('agents'),
});

const menu = createMenu(root, {
  onSkip: (face) => WP.openClassic(face),
  onResume: () => { if (game.ready && !game.started) opening.show({ met: completedCount(game.state) }); },
  onReset: () => { game.state = createState(); saveState(game.state); window.dispatchEvent(new CustomEvent('sitewalk:reset')); },
  onToggleSound: () => {
    audio.setMuted(!audio.muted);
    menu.setSound(!audio.muted);
    if (!audio.muted && game.started) audio.setAmbient(true);
  },
});
menu.setSound(!audio.muted);

// Click or tap anything with an icon on screen (a crew member or their marker, an audit board or
// clipboard, the site office door or arrow) to go straight to it: walk if it's close, jump if not.
const JUMP_BEYOND = 12;
function pickTargets() {
  const list = [...game.crew.members.flatMap((m) => [m.hit, m.plumbob]), ...game.checkpoints.items.map((c) => c.hit), game.world.officeDoor];
  game.world.officeMarker.traverse((o) => { if (o.isMesh && game.world.officeMarker.visible) list.push(o); });
  return list;
}
function targetOf(object) {
  if (!object) return null;
  if (object.userData.check) return { kind: 'audit', id: object.userData.check };
  if (object.userData.agentId != null) return { kind: 'crew', id: object.userData.agentId };
  return { kind: 'office' };
}
function goToTarget(t) {
  const p = game.player.pos;
  if (t.kind === 'crew') {
    const m = game.crew.byId(t.id);
    if (Math.hypot(m.pos.x - p.x, m.pos.z - p.z) > JUMP_BEYOND) return jumpTo(t.id, { talk: true });
    return game.player.walkTo(m.pos.x, m.pos.z, () => startTalk(t.id));
  }
  if (t.kind === 'audit') {
    const [x, z] = sectionById(t.id).spot;
    if (Math.hypot(x - p.x, z - p.z) > JUMP_BEYOND) return jumpTo(`audit:${t.id}`, { talk: true });
    return game.player.walkTo(x, z, () => startAudit(t.id), 1.8);
  }
  if (Math.hypot(OFFICE.door[0] - p.x, OFFICE.door[1] - p.z) > JUMP_BEYOND) return jumpTo('office');
  return game.player.walkTo(OFFICE.door[0] + 2, OFFICE.door[1], () => game.openOffice(), 0.6);
}
function wireTapToTalk() {
  const canvas = game.engine.renderer.domElement;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, game.engine.camera);
    return targetOf(ray.intersectObjects(pickTargets(), false)[0]?.object);
  };
  canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointermove', (e) => { if (!down) canvas.style.cursor = pick(e) ? 'pointer' : 'grab'; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) { down = null; return; }   // that was a drag
    down = null;
    if (!game.started || game.jumping || game.talkingId != null || auditPanel.isOpen() || menu.isOpen() || levelBoard.isOpen()) return;
    const t = pick(e);
    if (t) goToTarget(t);
  });
}

// "Go" on an objective (crew:3, audit:rfis, office, report) or a level (level:2): head straight there.
function goToObjective(go) {
  if (go.startsWith('crew:')) return goToTarget({ kind: 'crew', id: Number(go.slice(5)) });
  if (go.startsWith('audit:')) return goToTarget({ kind: 'audit', id: go.slice(6) });
  if (go.startsWith('level:')) {
    const level = siteScore(game.state).levels.find((l) => l.number === Number(go.slice(6)));
    const next = level?.tasks.find((t) => !t.done);
    return next && goToObjective(next.go);
  }
  if (officeOpen(game.state)) return goToTarget({ kind: 'office' });
  if (go === 'report') return openScorecard();            // the audit report counts too
  hud.toast(`Talk to ${OFFICE_UNLOCK - completedCount(game.state)} more of the crew first`);
  const p = game.player.pos;
  const m = game.crew.members.filter((x) => !isComplete(game.state, x.agentId))
    .sort((a, b) => Math.hypot(a.pos.x - p.x, a.pos.z - p.z) - Math.hypot(b.pos.x - p.x, b.pos.z - p.z))[0];
  if (m) goToTarget({ kind: 'crew', id: m.agentId });
}

// ---- Conversations, HUD and minimap ------------------------------------------------
const TALK_RANGE = 3.2;
let talk, hud, minimap, results, wheel, sitemap, auditPanel, scorecard, scoreboard, levelBoard, nearby = null, officeArmed = true;
let pendingLevel = null, lastZone = null;

function refreshProgress() {
  const ranking = rank(game.state);
  hud.setObjective(game.state);
  hud.updateClipboard(ranking, ranking.filter((r) => r.complete).length);
  const top = new Set(ranking.filter((r) => r.complete).slice(0, 3).map((r) => r.agentId));
  game.crew.members.forEach((m) => { m.setMet(isComplete(game.state, m.agentId)); m.setHighlight(top.has(m.agentId)); });
  game.world.setOfficeOpen(officeOpen(game.state));
  refreshAudit();
}

// Every change to progress goes through here: save it, then celebrate what it earned.
function commit(next) {
  const change = scoreChange(game.state, next);
  game.state = next;
  saveState(game.state);
  refreshLevels(change);
  if (change.levelComplete) {
    hud.toast(`Level ${change.levelComplete} complete · ★★★`);
    audio.fanfare();
    pendingLevel = change.levelComplete;
    showPendingLevel();
  } else {
    const star = change.starsUp[0];
    for (const label of change.completedNow) hud.toast(`Objective complete: ${label}${star ? ` · ${starText(star.stars)}` : ''}`);
  }
  if (change.rankUp) { hud.toast(`Promoted to ${change.rankUp}!`); if (!change.levelComplete) audio.chime(); }
  return change;
}

// The score badge, the level card and the beams over what's left in the current level.
function refreshLevels(change = {}) {
  const score = siteScore(game.state);
  scoreboard.update(score, change);
  hud.setLevel(score);
  const spots = [];
  let office = false;
  for (const t of score.allComplete ? [] : score.current.tasks.filter((k) => !k.done)) {
    if (t.id.startsWith('crew:')) { const m = game.crew.byId(Number(t.id.slice(5))); spots.push(() => m.pos); }
    else if (t.id.startsWith('audit:')) { const c = game.checkpoints.byId(t.id.slice(6)); spots.push(() => c.pos); }
    else if (officeOpen(game.state) && !office) { office = true; spots.push(() => ({ x: OFFICE.door[0] + 1.5, z: OFFICE.door[1] })); }
  }
  game.beacons.set(spots);
}

// A finished level gets its board as soon as nothing else is on screen.
const busy = () => !game.started || !gameActive() || game.jumping || game.talkingId != null || auditPanel.isOpen() || results.isOpen() || scorecard.isOpen()
  || sitemap.isOpen() || wheel.isOpen() || menu.isOpen() || levelBoard.isOpen();
function showPendingLevel() {
  if (pendingLevel == null || busy()) return;
  const completed = pendingLevel; pendingLevel = null;
  openLevelBoard({ completed });
}
function openLevelBoard({ completed = null } = {}) {
  if (!game.started || game.jumping || game.talkingId != null || auditPanel.isOpen() || results.isOpen()) return;
  menu.close(); sitemap.close(); wheel.close(); scoreboard.close();
  if (scorecard.isOpen()) scorecard.close();
  game.player.cancelWalk(); game.input.clear(); game.input.setJoystickVisible(false);
  menu.setVisible(false);
  hud.setPrompt(null);
  levelBoard.open(siteScore(game.state), { completed });
}
function closeLevelBoard() {
  levelBoard.close();
  menu.setVisible(true);
  game.input.setJoystickVisible(true);
  game.engine.renderer.domElement.focus?.();
}

// Walking into a level's part of the site shows its title card (once per change of level).
function tickZone() {
  if (!game.started || game.jumping) return;
  const z = zoneAt(game.player.pos.x, game.player.pos.z);
  if (z == null || z === lastZone) return;
  lastZone = z;
  hud.showZone(siteScore(game.state).levels[z - 1]);
}

function refreshAudit() {
  hud.setAudit(auditCompleted(game.state));
  for (const c of game.checkpoints.items) c.setDone(((game.state.audit || {})[c.id] || []).length === 5);
}

const sectionById = (id) => AUDIT_SECTIONS.find((s) => s.id === id);

// E / Space / the on-screen button: talk to the nearest crew member or start the nearest audit.
function interactWithNearby() {
  if (!nearby) return;
  if (nearby.section) startAudit(nearby.section.id); else startTalk(nearby.agentId);
}

function startAudit(id) {
  if (game.talkingId != null || auditPanel.isOpen() || !game.started) return;
  game.auditingId = id;
  game.player.cancelWalk();
  game.player.faceTowards(...sectionById(id).spot);
  game.input.clear();
  game.input.setJoystickVisible(false);
  hud.setPrompt(null);
  auditPanel.open(sectionById(id), game.state);
}
function endAudit() {
  auditPanel.close();
  game.auditingId = null;
  game.input.setJoystickVisible(true);
  game.engine.renderer.domElement.focus?.();
  showPendingLevel();
}
function openScorecard() {
  if (!game.started || game.jumping || game.talkingId != null || results.isOpen()) return;
  menu.close(); sitemap.close(); wheel.close();
  game.player.cancelWalk(); game.input.clear(); game.input.setJoystickVisible(false);
  menu.setVisible(false);
  scorecard.open(game.state);
}
function closeScorecard() {
  scorecard.close();
  menu.setVisible(true);
  game.input.setJoystickVisible(true);
  game.engine.renderer.domElement.focus?.();
  showPendingLevel();
}

function startTalk(agentId) {
  if (game.talkingId != null || !game.started) return;
  const m = game.crew.byId(agentId);
  game.talkingId = agentId;
  game.player.cancelWalk();
  game.player.faceTowards(m.pos.x, m.pos.z);
  game.input.clear();
  hud.setPrompt(null);
  game.input.setJoystickVisible(false);
  talk.open(m, game.state);
}

function endTalk() {
  talk.close();
  game.talkingId = null;
  game.input.setJoystickVisible(true);
  game.engine.renderer.domElement.focus?.();
  showPendingLevel();
}

function wireConversations() {
  game.startTalk = startTalk;
  hud = createHud(root, { onTalk: () => interactWithNearby(), onJump: openWheel, onScorecard: openScorecard, onPickAgent: (id) => jumpTo(id, { talk: true }), onGo: goToObjective, onLevels: () => openLevelBoard() });
  minimap = createMinimap(hud.left, { onOpen: openSiteMap });
  scoreboard = createScoreboard(hud.el, { onGo: goToObjective });
  levelBoard = createLevelBoard(root, { onGo: (go) => { closeLevelBoard(); goToObjective(go); }, onClose: closeLevelBoard });
  talk = createTalk(root, {
    onAnswer(agentId, q, choice) {
      const wasOpen = officeOpen(game.state);
      const next = recordAnswer(game.state, agentId, q, choice);
      const unlocked = !wasOpen && officeOpen(next);
      if (unlocked) { hud.toast('The site office is open'); audio.chime(); } else audio.blip();
      commit(next);
      refreshProgress();
      talk.open(game.crew.byId(agentId), game.state, { unlocked });
    },
    onLeave: endTalk,
    onRestart(agentId) {
      const answers = { ...game.state.answers }; delete answers[agentId];
      commit({ ...game.state, answers });
      refreshProgress();
      talk.open(game.crew.byId(agentId), game.state);
    },
  });
  game.input.on('talk', interactWithNearby);
  results = createResults(root, {
    agents: WP.agents,
    onClose: closeResults,
    onOpenDetails: (id, opener) => WP.showAgentModal(WP.agents.find((a) => a.id === id), opener),
    onClassic: (face) => { closeResults(); WP.openClassic(face); },
    onSaved: () => commit(markReportSaved(game.state)),
    onMeet: (id) => { closeResults(); jumpTo(id, { talk: true }); },
  });
  game.openOffice = openOffice;
  auditPanel = createAuditPanel(root, {
    onAnswer(id, q, choice) {
      commit(recordAuditAnswer(game.state, id, q, choice));
      const finished = (game.state.audit[id] || []).length === 5;
      refreshAudit();
      if (finished) audio.chime(); else audio.blip();
      auditPanel.open(sectionById(id), game.state);
    },
    onLeave: endAudit,
    onRedo(id) {
      commit(clearAuditSection(game.state, id));
      refreshAudit();
      auditPanel.open(sectionById(id), game.state);
    },
    onScorecard: () => { endAudit(); openScorecard(); },
  });
  scorecard = createScorecard(root, {
    onClose: closeScorecard,
    onGoTo: (id) => { closeScorecard(); jumpTo(`audit:${id}`, { talk: true }); },
    onSaved: () => commit(markReportSaved(game.state)),
  });
  wheel = createWheel(root, { onPick: jumpTo, onClose: closeWheel });
  sitemap = createSiteMap(root, {
    onPick: (id) => { closeSiteMap(); jumpTo(id, { talk: true }); },   // fly there and start talking
    onClose: closeSiteMap,
  });
  game.input.on('jump', openWheel);
  window.addEventListener('sitewalk:reset', () => {
    pendingLevel = null; lastZone = null;
    endTalk();
    if (levelBoard.isOpen()) closeLevelBoard();
    refreshProgress(); refreshLevels();
  });
  refreshProgress();
  refreshLevels();
}

// ---- Jump (GTA-style switch) ---------------------------------------------------------
function openWheel() {
  if (!game.started || game.jumping || game.talkingId != null || results.isOpen() || menu.isOpen() || levelBoard.isOpen()) return;
  game.player.cancelWalk();
  game.input.clear();
  const list = game.crew.members.map((m) => ({ id: m.agentId, label: m.data.name, sub: m.data.role, met: m.met }));
  if (officeOpen(game.state)) list.push({ id: 'office', label: 'Site office', sub: 'Your results', met: false });
  wheel.open(list);
}
function closeWheel() {
  wheel.close();
  game.engine.renderer.domElement.focus?.();
}
function mapView() {
  return { members: game.crew.members, player: game.player.pos, heading: game.player.root.rotation.y, officeOpen: officeOpen(game.state),
    checkpoints: AUDIT_SECTIONS.map((s) => ({ id: s.id, title: s.title, spot: s.spot, done: ((game.state.audit || {})[s.id] || []).length === 5 })) };
}
function openSiteMap() {
  if (!game.started || game.jumping || game.talkingId != null || results.isOpen() || levelBoard.isOpen()) return;
  menu.close(); wheel.close();
  game.player.cancelWalk();
  game.input.clear();
  game.input.setJoystickVisible(false);
  menu.setVisible(false);    // the menu button would sit over the map's close button on phones
  sitemap.open(mapView());
}
function closeSiteMap() {
  sitemap.close();
  menu.setVisible(true);
  game.input.setJoystickVisible(true);
  game.engine.renderer.domElement.focus?.();
}
function jumpTo(id, { talk = false } = {}) {
  closeWheel();
  audio.whoosh();
  if (typeof id === 'string' && id.startsWith('audit:')) {
    const section = sectionById(id.slice(6));
    const spot = { x: section.spot[0], z: section.spot[1] };
    game.jump.start(landingSpot(spot, game.player.pos), spot, talk ? () => startAudit(section.id) : undefined);
    return;
  }
  if (id === 'office') {
    const [a, b, c, d] = OFFICE.trigger;
    officeArmed = true;
    game.jump.start({ x: (a + b) / 2, z: (c + d) / 2 }, { x: OFFICE.door[0], z: OFFICE.door[1] });
    return;
  }
  const m = game.crew.byId(id);
  m.pause = Math.max(m.pause, 4);             // they wait for you
  game.jump.start(landingSpot(m.pos, game.player.pos), m.pos, talk ? () => startTalk(id) : undefined);
}

function openOffice() {
  if (!officeOpen(game.state)) {
    const left = 3 - completedCount(game.state);
    hud.toast(`Talk to ${left} more of the crew first`);
    return;
  }
  game.player.cancelWalk();
  game.input.clear();
  game.input.setJoystickVisible(false);
  hud.setPrompt(null);
  if (!game.state.officeSeen) commit({ ...game.state, officeSeen: true });
  menu.setVisible(false);   // the board has its own ways out; the menu button would cover its close button on phones
  results.open(game.state);
}
function closeResults() {
  results.close();
  menu.setVisible(true);
  game.input.setJoystickVisible(true);
  game.engine.renderer.domElement.focus?.();
  showPendingLevel();
}

let minimapFrame = 0;
function tickConversations() {
  const p = game.player.pos;
  nearby = null;
  if (game.started && game.talkingId == null && !auditPanel.isOpen() && !levelBoard.isOpen() && !game.jumping) {
    let best = TALK_RANGE;
    for (const m of game.crew.members) { const d = Math.hypot(m.pos.x - p.x, m.pos.z - p.z); if (d < best) { best = d; nearby = m; } }
    for (const c of game.checkpoints.items) { const d = Math.hypot(c.pos.x - p.x, c.pos.z - p.z); if (d < best) { best = d; nearby = c; } }
  }
  hud.setPrompt(nearby, isTouchDevice());
  hud.setJumpVisible(game.started && game.talkingId == null && !results.isOpen() && !sitemap.isOpen() && !auditPanel.isOpen() && !scorecard.isOpen() && !levelBoard.isOpen() && !game.jumping);
  // Walking through the site office door opens the results board (once per visit to the doorway).
  const [a, b, c, d] = OFFICE.trigger;
  const inDoor = p.x >= a && p.x <= b && p.z >= c && p.z <= d;
  if (inDoor && officeArmed && game.started && game.talkingId == null && !results.isOpen() && !levelBoard.isOpen() && !game.jumping) { officeArmed = false; openOffice(); }
  if (!inDoor) officeArmed = true;
  if (game.started && ++minimapFrame % 3 === 0) {
    minimap.draw(p, game.player.root.rotation.y, game.crew.members, officeOpen(game.state), mapView().checkpoints);
    sitemap.update(mapView());
  }
}

// Gravel footsteps while you walk (faster when running).
let stepClock = 0;
function tickFootsteps(dt) {
  if (!game.player.isMoving()) { stepClock = 0.2; return; }
  stepClock -= dt;
  if (stepClock <= 0) { audio.step(); stepClock = game.input.running() ? 0.2 : 0.28; }
}

// If the device can't keep up (under 30 fps for 4 s), step the quality down one tier.
function watchPerformance() {
  let samples = [];
  setInterval(() => {
    const engine = game.engine;
    if (!game.started || document.hidden || !document.documentElement.classList.contains('site-walk-on')) { samples = []; return; }
    samples = [...samples, engine.fps()].slice(-2);
    const next = nextTier(engine.tier, samples);
    if (next !== engine.tier) { engine.setTier(next); samples = []; }
  }, 4000);
}

let booting = null;
function boot() {
  if (booting) return booting;
  booting = (async () => {
    if (!webglAvailable()) return fallback();
    const loading = createLoading(root);
    try {
      const manifest = await loadManifest();
      game.engine = createEngine(root, tier);
      game.assets = await loadAssets(manifest, loading.progress);
      game.world = buildWorld(game.engine.scene, game.assets, { reducedMotion });
      game.world.setOfficeOpen(officeOpen(game.state));
      game.crew = createCrew(game.engine.scene, game.assets, CREW, { reducedMotion });
      game.checkpoints = buildCheckpoints(game.engine.scene, AUDIT_SECTIONS, { reducedMotion });
      game.beacons = createBeacons(game.engine.scene, { reducedMotion });
      game.crew.members.forEach((m) => m.setMet(isComplete(game.state, m.agentId)));
      game.input = createInput(root, { touch: isTouchDevice(), blocked: () => !game.started || menu.isOpen() || opening.isOpen() || game.talkingId != null || results?.isOpen() || wheel?.isOpen() || sitemap?.isOpen() || auditPanel?.isOpen() || scorecard?.isOpen() || levelBoard?.isOpen() || game.jumping });
      game.player = createPlayer(game.engine.scene, game.assets, game.engine, game.input, { reducedMotion });
      game.player.snapCamera();
      game.jump = createJump({ engine: game.engine, player: game.player, reducedMotion });
      wireTapToTalk();
      wireConversations();
      game.engine.onFrame((dt, t) => {
        game.world.update(dt, t);
        game.jump.update(dt);
        game.player.update(dt, t, game.started && !menu.isOpen() && game.talkingId == null && !results.isOpen() && !wheel.isOpen() && !sitemap.isOpen() && !auditPanel.isOpen() && !scorecard.isOpen() && !levelBoard.isOpen() && !game.jumping);
        game.crew.update(dt, t, game.player.pos, game.talkingId);
        game.checkpoints.update(t);
        game.beacons.update(t);
        tickConversations(t);
        tickZone();
        tickFootsteps(dt);
      });
      watchPerformance();
      loading.hide();
      opening.show({ met: completedCount(game.state) });
      game.ready = true;
    } catch (err) {
      loading.fail('The 3D site couldn\'t load.');
      console.warn('Site Walk failed to load', err);
      fallback();
    }
  })();
  return booting;
}

window.addEventListener('sitewalk:show', () => {
  boot(); game.engine?.resume(); game.engine?.resize();
  if (game.started) audio.setAmbient(true);
  else if (game.ready && !opening.isOpen()) opening.show({ met: completedCount(game.state) });   // skipped earlier, now back
});
window.addEventListener('sitewalk:hide', () => { game.engine?.pause(); menu.close(); audio.setAmbient(false); if (game.talkingId != null) endTalk(); if (auditPanel?.isOpen()) endAudit(); if (scorecard?.isOpen()) closeScorecard(); if (levelBoard?.isOpen()) closeLevelBoard(); });
if (!deepLink) boot();

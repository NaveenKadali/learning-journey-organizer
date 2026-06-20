'use strict';

// ═══════════════════════════════════════════
//  REPO BASE URL
//  Points to the branch all content is served from.
//  Change this one line when merging to main.
// ═══════════════════════════════════════════
const REPO_BASE = 'https://raw.githubusercontent.com/NaveenKadali/learning-journey-organizer/feature/multi-roadmap/';

// Wrap fetch with a hard timeout so a hung/pending request (no response,
// no error — e.g. blocked by an extension, DNS hiccup, captive portal)
// can't leave the UI stuck on a loading spinner forever.
function fetchWithTimeout(url, ms = 12000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal })
    .finally(() => clearTimeout(timer))
    .catch(err => {
      if (err.name === 'AbortError') throw new Error(`Request timed out after ${ms/1000}s — check your network or the file path`);
      throw err;
    });
}

// ═══════════════════════════════════════════
//  STORAGE KEYS
// ═══════════════════════════════════════════
const KEY_CFG         = 'roadmap_gist_cfg';
const KEY_THEME       = 'roadmap_theme';
const KEY_LAST_ACTIVE = 'roadmap_last_active';
// Per-roadmap keys — namespaced by roadmap ID
function keyProgress(id)  { return `roadmap_progress_${id}`; }
function keyResources(id) { return `roadmap_resources_${id}`; }
function keyTotalCache(id) { return `roadmap_totals_${id}`; }

// ═══════════════════════════════════════════
//  ACTIVE ROADMAP STATE
// ═══════════════════════════════════════════
let _catalog        = [];   // array of { id, title, badge, subtitle, path }
let _activeRoadmap  = null; // currently loaded catalog entry
let _rvStructure    = { sections:0, phases:0, modules:0, totalTasks:0 }; // structural counts for the active roadmap, set once on render()
let _catalogStats   = {};   // { [id]: { sections, phases, totalTasks } } — structural counts for EVERY catalog roadmap, known up front (even before opening it)

// ═══════════════════════════════════════════
//  DIRTY FLAG  (unsaved local changes)
// ═══════════════════════════════════════════
let _dirty = false;
function setDirty(val) {
  _dirty = val;
  const title = _activeRoadmap?.title || 'Roadmap';
  document.title = val ? `● ${title}` : title;
  updateActionBar();
}

// ═══════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon  = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  const sub   = document.getElementById('theme-sublabel');
  if (theme === 'dark') {
    if (icon)  icon.textContent  = '☀️';
    if (label) label.textContent = 'Light';
    if (sub)   sub.textContent   = 'Dark mode';
  } else {
    if (icon)  icon.textContent  = '🌙';
    if (label) label.textContent = 'Dark';
    if (sub)   sub.textContent   = 'Light mode';
  }
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(KEY_THEME, next); } catch (e) { console.warn('Could not persist theme:', e); }
}
(function() {
  try {
    const saved = localStorage.getItem(KEY_THEME) || 'dark';
    applyTheme(saved);
  } catch (e) {
    // localStorage can throw (SecurityError) in some hosted/sandboxed
    // contexts even though it works fine from a local file:// load.
    // Never let that kill the rest of the script — fall back to dark.
    console.warn('localStorage unavailable, using default theme:', e);
    applyTheme('dark');
  }
})();

// ═══════════════════════════════════════════
//  GIST CONFIG
// ═══════════════════════════════════════════
function getCfg() { try { return JSON.parse(localStorage.getItem(KEY_CFG)||'{}'); } catch { return {}; } }
function setCfg(o) { try { localStorage.setItem(KEY_CFG, JSON.stringify(o)); } catch (e) { showToast('Could not save settings — storage is blocked in this browser', 'error'); } }

// ═══════════════════════════════════════════
//  LOCAL PROGRESS  (per roadmap)
// ═══════════════════════════════════════════
function loadProgress(id) {
  const k = keyProgress(id || _activeRoadmap?.id || 'default');
  try { return JSON.parse(localStorage.getItem(k)||'{}'); } catch { return {}; }
}
function saveLocalProgress(data, id) {
  const k = keyProgress(id || _activeRoadmap?.id || 'default');
  try { localStorage.setItem(k, JSON.stringify(data)); }
  catch (e) { showToast('Could not save progress — storage is blocked in this browser', 'error'); }
}

// ═══════════════════════════════════════════
//  RESOURCES  (per roadmap)  { moduleId: [{id,title,url,type}] }
// ═══════════════════════════════════════════
function loadResources(id) {
  const k = keyResources(id || _activeRoadmap?.id || 'default');
  try { return JSON.parse(localStorage.getItem(k)||'{}'); } catch { return {}; }
}
function saveLocalResources(data, id) {
  const k = keyResources(id || _activeRoadmap?.id || 'default');
  try { localStorage.setItem(k, JSON.stringify(data)); }
  catch (e) { showToast('Could not save resources — storage is blocked in this browser', 'error'); }
}

// ═══════════════════════════════════════════
//  RELATIVE TIME  ("2 min ago", "3 hrs ago", etc.)
// ═══════════════════════════════════════════
function relativeTime(iso) {
  if (!iso) return null;
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 5)   return 'just now';
  if (secs < 60)  return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} hr${hrs>1?'s':''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days>1?'s':''} ago`;
}

// Tick every 30 s so relative times stay fresh
setInterval(updateHeaderButtons, 30000);

// ═══════════════════════════════════════════
//  UPDATE ACTION BAR SUB-LABELS
//  Replaces the old sync-strip entirely.
//  Called whenever state changes.
// ═══════════════════════════════════════════
function updateActionBar() {
  const cfg         = getCfg();
  const prog        = loadProgress();
  const gistSync    = prog.__gistSyncTime;
  const localSaveTs = prog.__localSaveTime;

  // --- Save sub-label: coloured dot + "Unsaved" when dirty, else relative save time ---
  const saveLbl = document.getElementById('save-time-label');
  if (saveLbl) {
    if (_dirty) {
      saveLbl.innerHTML  = '<span style="color:#d97706">●</span> Unsaved';
      saveLbl.className  = 'btn-sublabel yellow';
    } else {
      saveLbl.textContent = relativeTime(localSaveTs) || 'never saved';
      saveLbl.className   = localSaveTs ? 'btn-sublabel green' : 'btn-sublabel';
    }
  }

  // --- Sync sub-label: no PAT / no gist / last gist sync time ---
  const syncLbl = document.getElementById('sync-time-label');
  if (syncLbl) {
    if (!cfg.pat) {
      syncLbl.textContent = 'no PAT set';
      syncLbl.className   = 'btn-sublabel red';
    } else if (!cfg.gistId) {
      syncLbl.textContent = 'no gist yet';
      syncLbl.className   = 'btn-sublabel yellow';
    } else {
      syncLbl.textContent = gistSync ? relativeTime(gistSync) : 'never synced';
      syncLbl.className   = gistSync ? 'btn-sublabel green' : 'btn-sublabel';
    }
  }

  // --- Settings sub-label: connection status ---
  const connLbl = document.getElementById('gist-conn-label');
  if (connLbl) {
    if (!cfg.pat) {
      connLbl.textContent = '⚠ not connected';
      connLbl.className   = 'btn-sublabel red';
    } else if (!cfg.gistId) {
      connLbl.textContent = '● no gist yet';
      connLbl.className   = 'btn-sublabel yellow';
    } else {
      connLbl.textContent = '● connected';
      connLbl.className   = 'btn-sublabel green';
    }
  }
}

// Keep updateHeaderButtons as alias so existing call-sites still work
function updateHeaderButtons() { updateActionBar(); }

// ═══════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════
let _toastTimer;
function showToast(msg, type='info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3400);
}

// ═══════════════════════════════════════════
//  MODALS
// ═══════════════════════════════════════════
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

function saveGistSettings() {
  const pat    = document.getElementById('pat-input')?.value.trim() || '';
  const gistId = document.getElementById('gist-input')?.value.trim() || '';
  if (!pat) { showToast('PAT is required', 'error'); return; }
  setCfg({ pat, gistId });
  closeModal('settings-modal');
  showToast('Settings saved', 'success');
  updateActionBar();
}

// ═══════════════════════════════════════════
//  BUILD GIST PAYLOAD  (v5 — all roadmaps)
// ═══════════════════════════════════════════
function buildGistPayload() {
  const now = new Date().toISOString();
  const roadmaps = {};
  // Snapshot every known roadmap from the catalog
  _catalog.forEach(entry => {
    const progress  = collectProgress(entry.id === _activeRoadmap?.id ? null : entry.id);
    if (entry.id === _activeRoadmap?.id) {
      // Live collection for the active roadmap
      const live = collectProgress();
      live.__gistSyncTime = now;
      live.__theme        = document.documentElement.getAttribute('data-theme') || 'dark';
      roadmaps[entry.id]  = { progress: live, resources: loadResources() };
    } else {
      // Load persisted data for inactive roadmaps
      roadmaps[entry.id] = {
        progress:  loadProgress(entry.id),
        resources: loadResources(entry.id)
      };
    }
  });
  return { __version: 'v5', __saved: now, roadmaps };
}

function applyGistPayload(payload) {
  if (!payload) return;
  const now = new Date().toISOString();

  // v5 format: { roadmaps: { [id]: { progress, resources } } }
  if (payload.__version === 'v5' && payload.roadmaps) {
    Object.entries(payload.roadmaps).forEach(([id, data]) => {
      if (data.progress) {
        data.progress.__gistSyncTime = now;
        saveLocalProgress(data.progress, id);
        // Apply to UI only if this is the active roadmap
        if (id === _activeRoadmap?.id) {
          applyProgressToUI(data.progress);
          if (data.progress.__theme) {
            applyTheme(data.progress.__theme);
            localStorage.setItem(KEY_THEME, data.progress.__theme);
          }
        }
      }
      if (data.resources) {
        saveLocalResources(data.resources, id);
        if (id === _activeRoadmap?.id) {
          document.querySelectorAll('[data-res-module-id]').forEach(panel => {
            renderResourcePanel(panel.dataset.resModuleId, panel);
          });
        }
      }
    });
    return;
  }

  // v4 fallback migration: treat as active roadmap data
  if (payload.progress) {
    payload.progress.__gistSyncTime = now;
    saveLocalProgress(payload.progress);
    applyProgressToUI(payload.progress);
    if (payload.progress.__theme) {
      applyTheme(payload.progress.__theme);
      localStorage.setItem(KEY_THEME, payload.progress.__theme);
    }
  }
  if (payload.resources) {
    saveLocalResources(payload.resources);
    document.querySelectorAll('[data-res-module-id]').forEach(panel => {
      renderResourcePanel(panel.dataset.resModuleId, panel);
    });
  }
}

// ═══════════════════════════════════════════
//  GIST SAVE
// ═══════════════════════════════════════════
async function saveToGist() {
  const cfg = getCfg();
  if (!cfg.pat) { openModal('settings-modal'); showToast('Enter your GitHub PAT first', 'info'); return; }
  const btn = document.getElementById('btn-save');
  btn.classList.add('busy'); btn.textContent = 'Saving…';
  try {
    const content = JSON.stringify(buildGistPayload(), null, 2);
    let res;
    if (cfg.gistId) {
      res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        method:'PATCH',
        headers:{ Authorization:`token ${cfg.pat}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ files:{ 'roadmap-data.json':{ content } } })
      });
    } else {
      res = await fetch('https://api.github.com/gists', {
        method:'POST',
        headers:{ Authorization:`token ${cfg.pat}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ description:'Learning Journey Roadmap', public:false, files:{ 'roadmap-data.json':{ content } } })
      });
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    if (!cfg.gistId) { cfg.gistId = data.id; setCfg(cfg); }
    // Stamp both sync times on the active roadmap's local storage
    const now = new Date().toISOString();
    const prog = loadProgress();
    prog.__gistSyncTime  = now;
    prog.__localSaveTime = now;
    saveLocalProgress(prog);
    setDirty(false);
    updateDashboard();
    showToast('✓ Saved to GitHub Gist', 'success');
  } catch(e) {
    showToast(`Save failed: ${e.message}`, 'error');
  } finally {
    btn.classList.remove('busy');
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Save`;
    updateActionBar();
  }
}

// ═══════════════════════════════════════════
//  GIST SYNC
// ═══════════════════════════════════════════
async function syncFromGist() {
  const cfg = getCfg();
  if (!cfg.pat || !cfg.gistId) { openModal('settings-modal'); showToast('Configure PAT & Gist ID first', 'info'); return; }
  const btn = document.getElementById('btn-sync');
  btn.textContent = 'Syncing…';
  try {
    const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
      headers:{ Authorization:`token ${cfg.pat}` }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const data = await res.json();
    const raw = data.files?.['roadmap-data.json']?.content;
    if (!raw) throw new Error('roadmap-data.json not found in Gist');
    const payload = JSON.parse(raw);
    applyGistPayload(payload);  // handles v5 and v4 migration
    setDirty(false);
    updateDashboard();
    showToast('✓ Synced from GitHub Gist', 'success');
  } catch(e) {
    showToast(`Sync failed: ${e.message}`, 'error');
  } finally {
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg> Sync`;
    updateActionBar();
  }
}

// ═══════════════════════════════════════════
//  PROGRESS COLLECT / APPLY
// ═══════════════════════════════════════════
function collectProgress() {
  const out = {};
  document.querySelectorAll('.task-cb').forEach(cb => { out[cb.dataset.id] = cb.checked; });
  return out;
}
function applyProgressToUI(progress) {
  document.querySelectorAll('.task-cb').forEach(cb => {
    if (progress[cb.dataset.id] !== undefined) cb.checked = progress[cb.dataset.id];
  });
  document.querySelectorAll('.phase-card').forEach(updatePhaseState);
}
function localSave() {
  const d    = collectProgress();
  const prev = loadProgress();  // uses active roadmap id automatically
  d.__gistSyncTime  = prev.__gistSyncTime  || null;
  d.__localSaveTime = new Date().toISOString();
  d.__theme         = document.documentElement.getAttribute('data-theme') || 'dark';
  saveLocalProgress(d);  // uses active roadmap id automatically
  setDirty(true);
}

// ═══════════════════════════════════════════
//  PARSE MARKDOWN
//  Structure:
//    <!-- section: // Label -->  → new section
//    > # Label                   → new section  (alt syntax, single-hash blockquote)
//    ##  title  or  > ##  title  → accordion card
//    ### title  or  > ### title  → module
//    #### title or  > #### title → sub-module inside module
//    ##### title or > ##### title→ sub-module alias (same as ####)
//    - [ ] / - [x]               → task
// ═══════════════════════════════════════════
function slug(s) {
  return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'item';
}
// Normalise a raw line: strip leading blockquote marker(s) so
// "> ## Title" becomes "## Title" before pattern matching.
function normaliseBlockquote(line) {
  return line.replace(/^(>\s*)+/, '');
}

// Every level (phase / module / submodule / topic) shares the same shape,
// which is what lets rendering and task-collection recurse generically
// instead of having one hand-written function per heading depth.
function makeNode(title) {
  return { title, id: slug(title), modules: [], tasks: [], _blocks: [] };
}
function makeSection(label) {
  return { label, items: [], _blocks: [] };
}

// Collapse the raw paragraph/list/code blocks captured for a heading into
// its final `supporting` field. A single short paragraph stays inline
// ("simple"); anything richer (a list, a code fence, multiple paragraphs)
// becomes a collapsible notes block ("rich") so it can't crowd the checklist.
function finalizeSupporting(blocks) {
  if (!blocks || !blocks.length) return null;
  if (blocks.length === 1 && blocks[0].type === 'p') {
    return { kind: 'simple', text: blocks[0].text };
  }
  return { kind: 'rich', blocks };
}
function finalizeNode(node) {
  node.supporting = finalizeSupporting(node._blocks);
  delete node._blocks;
  (node.modules || []).forEach(finalizeNode);
  return node;
}

function parseRoadmap(md) {
  const lines = md.split('\n');
  const sections = [];
  const overviewBlocks = [];
  let curSection = null, curItem = null, curMod = null, curSubMod = null, curTopic = null;

  // `target` is whichever node is currently eligible to receive supporting
  // content (paragraphs / lists / code fences). It's reassigned every time a
  // new heading is created, and cleared the moment a task line appears —
  // matching the authoring rule "supporting content must come immediately
  // after its heading, before that heading's first child or task".
  let target = { _blocks: overviewBlocks };
  let paraBuf = [];

  function flushPara() {
    if (paraBuf.length && target) {
      target._blocks.push({ type: 'p', text: paraBuf.join(' ') });
    }
    paraBuf = [];
  }
  function pushListItem(ordered, text) {
    flushPara();
    if (!target) return;
    const blocks = target._blocks;
    const last = blocks[blocks.length - 1];
    if (last && last.type === 'list' && last.ordered === ordered) last.items.push(text);
    else blocks.push({ type: 'list', ordered, items: [text] });
  }
  function handlePlainLine(line) {
    const trimmed = line.trim();
    if (!trimmed) { flushPara(); return; }
    const olM = trimmed.match(/^\d+\.\s+(.*)/);
    const ulM = trimmed.match(/^[-*]\s+(?!\[[ xX✓]\])(.*)/);
    if (olM) { pushListItem(true, olM[1]); return; }
    if (ulM) { pushListItem(false, ulM[1]); return; }
    paraBuf.push(trimmed);
  }
  function addTask(line, taskArr) {
    const m = line.match(/^[-*]\s+\[([ xX✓])\]\s+(.*)/);
    if (!m) return false;
    const checked = /^[xX✓]$/.test(m[1].trim());
    taskArr.push({ text: m[2].trim(), checked, id: slug(m[2].trim()) });
    return true;
  }

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const wasQuoted = /^>\s*/.test(raw);
    const line = normaliseBlockquote(raw);

    // ── Fenced code block — consumed as one atomic, opaque block. Its
    // contents are never re-parsed as headings/tasks, and never flattened
    // into prose (this is what keeps an ASCII diagram or phase index intact).
    const fenceM = line.match(/^```\s*([a-zA-Z0-9_-]*)/);
    if (fenceM) {
      flushPara();
      const lang = fenceM[1] || '';
      const codeLines = [];
      i++;
      while (i < lines.length) {
        const innerLine = normaliseBlockquote(lines[i]);
        if (/^```\s*$/.test(innerLine)) { i++; break; }
        codeLines.push(innerLine);
        i++;
      }
      if (target) target._blocks.push({ type: 'code', lang, text: codeLines.join('\n') });
      continue;
    }

    const secM = raw.match(/<!--\s*section:\s*(.+?)\s*-->/i);
    if (secM) {
      curSection = makeSection(secM[1].trim());
      sections.push(curSection);
      curItem = curMod = curSubMod = curTopic = null;
      target = curSection; paraBuf = [];
      i++; continue;
    }
    // Alt section syntax: "> # Label" — single hash, must be blockquoted.
    if (wasQuoted && /^#\s+/.test(line) && !/^##/.test(line)) {
      const label = line.replace(/^#\s+/, '').trim();
      curSection = makeSection(label);
      sections.push(curSection);
      curItem = curMod = curSubMod = curTopic = null;
      target = curSection; paraBuf = [];
      i++; continue;
    }
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      flushPara();
      const title = line.replace(/^##\s+/, '').trim();
      if (!curSection) { curSection = makeSection(''); sections.push(curSection); }
      curItem = makeNode(title);
      curMod = curSubMod = curTopic = null;
      curSection.items.push(curItem);
      target = curItem; paraBuf = [];
      i++; continue;
    }
    if (!curItem) {
      // Before the first Phase — plain text here belongs to whatever's
      // currently active: the roadmap-level overview, or a section overview.
      handlePlainLine(line);
      i++; continue;
    }
    if (/^###\s+/.test(line) && !/^####/.test(line)) {
      flushPara();
      const title = line.replace(/^###\s+/, '').trim();
      curMod = makeNode(title);
      curSubMod = curTopic = null;
      curItem.modules.push(curMod);
      target = curMod; paraBuf = [];
      i++; continue;
    }
    if (/^####\s+/.test(line) && !/^#####/.test(line)) {
      flushPara();
      const title = line.replace(/^####\s+/, '').trim();
      curSubMod = makeNode(title);
      curTopic = null;
      (curMod || curItem).modules.push(curSubMod);
      target = curSubMod; paraBuf = [];
      i++; continue;
    }
    if (/^#####\s+/.test(line)) {
      flushPara();
      const title = line.replace(/^#####\s+/, '').trim();
      curTopic = makeNode(title);
      // Nests under the nearest Submodule (falling back to Module, then
      // Phase, if shallower levels were skipped) — this is the fix for the
      // old bug where ##### became a sibling instead of a true child.
      (curSubMod || curMod || curItem).modules.push(curTopic);
      target = curTopic; paraBuf = [];
      i++; continue;
    }
    const taskArr = (curTopic || curSubMod || curMod || curItem).tasks;
    if (addTask(line, taskArr)) {
      flushPara();
      target = null; // this node's supporting-content window has closed
      i++; continue;
    }
    handlePlainLine(line);
    i++;
  }
  flushPara();

  const overview = finalizeSupporting(overviewBlocks);
  sections.forEach(sec => {
    sec.overview = finalizeSupporting(sec._blocks || []);
    delete sec._blocks;
    (sec.items || []).forEach(finalizeNode);
  });
  return { sections, overview };
}

// Recursively gather every task under a node, no matter how deep the
// module/submodule/topic chain goes.
function collectTasks(node) {
  let tasks = (node.tasks || []).slice();
  (node.modules || []).forEach(child => { tasks = tasks.concat(collectTasks(child)); });
  return tasks;
}

// ═══════════════════════════════════════════
//  ICON PALETTE
// ═══════════════════════════════════════════
const ICON_PALETTE = [
  {icon:'🐍', bg:'rgba(59,130,246,.12)',  br:'rgba(59,130,246,.28)'},
  {icon:'⚡', bg:'rgba(245,158,11,.12)',  br:'rgba(245,158,11,.28)'},
  {icon:'🧠', bg:'rgba(139,92,246,.12)',  br:'rgba(139,92,246,.28)'},
  {icon:'🔗', bg:'rgba(34,197,94,.12)',   br:'rgba(34,197,94,.28)'},
  {icon:'🚀', bg:'rgba(239,68,68,.12)',   br:'rgba(239,68,68,.28)'},
  {icon:'🏗️', bg:'rgba(6,182,212,.12)',   br:'rgba(6,182,212,.28)'},
  {icon:'📊', bg:'rgba(249,115,22,.12)',  br:'rgba(249,115,22,.28)'},
  {icon:'🔍', bg:'rgba(99,102,241,.12)',  br:'rgba(99,102,241,.28)'},
  {icon:'🛡️', bg:'rgba(20,184,166,.12)',  br:'rgba(20,184,166,.28)'},
  {icon:'🎯', bg:'rgba(236,72,153,.12)',  br:'rgba(236,72,153,.28)'},
];
let _iconIdx = 0;
function nextMeta() { return ICON_PALETTE[_iconIdx++ % ICON_PALETTE.length]; }

// ═══════════════════════════════════════════
//  RESOURCES SECTION HEADER — IS the toggler
// ═══════════════════════════════════════════
function resSection(id, resources) {
  const cnt = (resources[id] || []).length;
  return `<div class="res-section-header${cnt > 0 ? '' : ''}" id="res-toggler-${id}" onclick="toggleResPanel('${id}',this)">
    <span class="res-section-icon">📚</span>
    <span class="res-section-label">Resources</span>
    <span class="res-count" id="res-count-${id}">${cnt}</span>
    <svg class="res-section-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
  </div>
  <div class="res-panel" id="res-panel-${id}" style="display:none" data-res-module-id="${id}">
  </div>`;
}

// ═══════════════════════════════════════════
//  SUPPORTING CONTENT (description / notes) — shared by every level,
//  including sections and the roadmap itself.
// ═══════════════════════════════════════════
function renderSuppBlocks(blocks) {
  return blocks.map(b => {
    if (b.type === 'p')    return `<p>${esc(b.text)}</p>`;
    if (b.type === 'code') return `<pre class="supp-code"><code>${esc(b.text)}</code></pre>`;
    if (b.type === 'list') {
      const tag = b.ordered ? 'ol' : 'ul';
      return `<${tag}>${b.items.map(it => `<li>${esc(it)}</li>`).join('')}</${tag}>`;
    }
    return '';
  }).join('');
}
function renderSupporting(supporting, id) {
  if (!supporting) return '';
  if (supporting.kind === 'simple') {
    return `<p class="supp-caption">${esc(supporting.text)}</p>`;
  }
  return `<div class="supp-notes" id="supp-${id}">
    <div class="supp-notes-header" onclick="this.parentElement.classList.toggle('open')">
      <span class="supp-notes-icon">ⓘ</span>
      <span class="supp-notes-label">Notes</span>
      <svg class="supp-notes-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="supp-notes-body"><div class="supp-notes-body-inner">${renderSuppBlocks(supporting.blocks)}</div></div>
  </div>`;
}

// ═══════════════════════════════════════════
//  RECURSIVE NODE RENDERING (### module, #### submodule, ##### topic —
//  one function handles every depth, so adding a level never means adding
//  another hand-written render function again).
//
//  `depth` = the depth of the CHILDREN about to be rendered:
//    1 = module, 2 = submodule, 3 = topic (and beyond, if ever extended).
// ═══════════════════════════════════════════
function renderNodeBody(node, progress, resources, depth) {
  let html = renderSupporting(node.supporting, node.id);
  html += renderTaskList(node.tasks || [], progress);
  html += resSection(node.id, resources);
  html += renderGroupChildren(node, progress, resources, depth);
  return html;
}
function renderGroupChildren(node, progress, resources, depth) {
  return (node.modules || []).map(child => {
    const resCnt   = (resources[child.id] || []).length;
    const lvlClass  = depth === 2 ? ' lvl-2' : depth === 3 ? ' lvl-3' : '';
    // Modules start collapsed (there can be many); submodules and topics
    // start open since they're usually short — no extra click just to see
    // what's inside a card you already chose to expand.
    const openClass = depth === 1 ? '' : ' open';
    return `<div class="module-group${lvlClass}${openClass}" id="mg-${child.id}">
      <div class="module-header" onclick="toggleModule(this.parentElement)">
        <div class="module-title">${esc(child.title)}</div>
        <div class="module-header-right">
          <span class="mod-res-pill${resCnt > 0 ? ' visible' : ''}" id="mod-res-pill-${child.id}">📚 ${resCnt}</span>
          <svg class="module-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div class="module-body">
        <div class="module-body-inner">
          ${renderNodeBody(child, progress, resources, depth + 1)}
        </div>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════
//  RENDER ITEM BODY  (## level — the phase card itself)
// ═══════════════════════════════════════════
function renderItemBody(item, progress, resources) {
  let html = renderSupporting(item.supporting, item.id);
  if ((item.tasks || []).length) {
    html += renderTaskList(item.tasks, progress);
    html += resSection(item.id, resources);
  }
  html += renderGroupChildren(item, progress, resources, 1);
  if (!(item.tasks || []).length && !(item.modules || []).length) {
    html += resSection(item.id, resources);
  }
  return html;
}

// ═══════════════════════════════════════════
//  BUILD ACCORDION CARD (## item)
// ═══════════════════════════════════════════
function buildCard(item, progress, resources, meta, numStr) {
  const body = renderItemBody(item, progress, resources);
  const allTasks = collectTasks(item);
  allTasks.forEach(t => { if (progress[t.id] !== undefined) t.checked = progress[t.id]; });
  const done  = allTasks.filter(t => t.checked).length;
  const tot   = allTasks.length;
  const pct   = tot ? Math.round(done / tot * 100) : 0;
  const state = tot === 0 ? 'notstarted' : done === tot ? 'done' : done > 0 ? 'active' : 'notstarted';

  const card = mkEl('div', 'phase-card');
  card.dataset.state = state;
  // Ring geometry — r=15.5, circumference ≈ 97.4 (matches the home-view card ring)
  const ringC = 97.4;
  const ringOffset = tot === 0 ? ringC : ringC - (pct/100) * ringC;
  card.innerHTML = `
    <div class="phase-header" onclick="togglePhase(this.parentElement)">
      <div class="phase-icon" style="background:${meta.bg};border:1px solid ${meta.br}">${meta.icon}</div>
      <div class="phase-meta">
        <div class="phase-name">${esc(item.title)}</div>
      </div>
      <div class="phase-right">
        <div class="phase-ring${state==='done'?' is-done':''}" title="${done} of ${tot} tasks complete">
          <svg viewBox="0 0 36 36">
            <circle class="phase-ring-bg"   cx="18" cy="18" r="15.5"/>
            <circle class="phase-ring-fill" cx="18" cy="18" r="15.5"
                    stroke-dasharray="${ringC}"
                    stroke-dashoffset="${ringOffset}"/>
          </svg>
          <div class="phase-ring-label">${done}/${tot}</div>
        </div>
        <svg class="phase-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>
    <div class="phase-body">
      <div class="phase-body-inner">${body}</div>
    </div>`;
  return card;
}

// ═══════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════
function render(data) {
  const progress  = loadProgress();
  const resources = loadResources();
  _iconIdx = 0;

  let totalTasks = 0, totalMods = 0, totalItems = 0;
  data.sections.forEach(sec => {
    (sec.items || []).forEach(item => {
      totalItems++;
      totalTasks += collectTasks(item).length;
      totalMods  += (item.modules || []).length;
    });
  });
  const roadmapMeta = document.getElementById('roadmap-meta');
  if (roadmapMeta) roadmapMeta.textContent =
    `${data.sections.length} sections · ${totalItems} topics · ${totalMods} modules · ${totalTasks} tasks`;
  _rvStructure = { sections: data.sections.length, phases: totalItems, modules: totalMods, totalTasks };

  const main = document.getElementById('main-content');
  main.innerHTML = '';

  if (data.overview) {
    const ov = mkEl('div', 'roadmap-overview');
    ov.innerHTML = renderSupporting(data.overview, 'roadmap');
    main.appendChild(ov);
  }

  data.sections.forEach((section, secIdx) => {
    if (section.label) main.appendChild(mkEl('div', 'section-label', section.label));
    if (section.overview) {
      const so = mkEl('div', 'section-overview');
      so.innerHTML = renderSupporting(section.overview, 'sec-' + secIdx);
      main.appendChild(so);
    }
    const list = mkEl('div', 'phase-list');
    (section.items || []).forEach((item) => {
      const meta = nextMeta();
      const card = buildCard(item, progress, resources, meta, '');
      list.appendChild(card);
    });
    main.appendChild(list);
  });

  const noRes = mkEl('div', 'no-results', 'No items match.'); noRes.id = 'no-results';
  main.appendChild(noRes);

  document.querySelectorAll('.task-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      localSave();
      updatePhaseState(cb.closest('.phase-card'));
      updateDashboard();
    });
  });

  updateDashboard();
  applyCurrentFilter();
  updateActionBar();
  syncAllModulePills();  // ensure pills are visible for pre-existing resources on reload
}

// After the DOM is built, walk all module pills and correct their state from live resources
function syncAllModulePills() {
  const resources = loadResources();
  document.querySelectorAll('[id^="mod-res-pill-"]').forEach(pill => {
    const modId = pill.id.replace('mod-res-pill-', '');
    const cnt   = (resources[modId] || []).length;
    pill.textContent = `📚 ${cnt}`;
    pill.classList.toggle('visible', cnt > 0);
  });
}

function renderTaskList(tasks, progress) {
  if (!tasks.length) return '';
  return '<ul class="task-list">' + tasks.map(t => {
    const checked = progress[t.id]!==undefined ? progress[t.id] : t.checked;
    return `<li class="task-item" onclick="toggleTask(event,this)">
      <input type="checkbox" class="task-cb" data-id="${t.id}" ${checked?'checked':''}>
      <label class="task-text">${esc(t.text)}</label>
    </li>`;
  }).join('') + '</ul>';
}

function toggleTask(e, li) {
  if (e.target.tagName==='INPUT'||e.target.tagName==='LABEL') return;
  const cb = li.querySelector('.task-cb'); cb.checked=!cb.checked;
  cb.dispatchEvent(new Event('change'));
}

// ═══════════════════════════════════════════
//  RESOURCES
// ═══════════════════════════════════════════
const RES_TYPES  = ['video','article','doc','github','pdf','note','other'];
const RT_LABELS  = { video:'Video', article:'Article', doc:'Docs', github:'GitHub', pdf:'PDF', note:'Note', other:'Other' };

function toggleResPanel(moduleId, headerEl) {
  const panel = document.getElementById(`res-panel-${moduleId}`);
  if (!panel) return;
  const isOpen = panel.style.display === 'block';
  panel.style.display = isOpen ? 'none' : 'block';
  headerEl.classList.toggle('open', !isOpen);
  if (!isOpen) {
    renderResourcePanel(moduleId, panel);
    const mg = panel.closest('.module-group');
    if (mg && !mg.classList.contains('open')) mg.classList.add('open');
  }
}

function renderResourcePanel(moduleId, panelEl) {
  panelEl.innerHTML = `<div class="res-panel-inner">${renderResourcePanelInner(moduleId, loadResources())}</div>`;
  const cnt = (loadResources()[moduleId] || []).length;

  // Update the count badge on the res-section-header
  const countEl = document.getElementById(`res-count-${moduleId}`);
  if (countEl) countEl.textContent = cnt;

  // Update this module's header pill directly
  const pill = document.getElementById(`mod-res-pill-${moduleId}`);
  if (pill) {
    pill.textContent = `📚 ${cnt}`;
    pill.classList.toggle('visible', cnt > 0);
  }
  updateDashboard();
}

function renderResourcePanelInner(moduleId, resources) {
  const list = resources[moduleId] || [];
  let html = '';
  if (list.length) {
    html += `<div class="res-list">` + list.map(r => {
      const cls   = `rt-${r.type||'other'}`;
      const label = RT_LABELS[r.type]||'Other';
      const isNote = r.type === 'note' || !r.url;
      const linkOrNote = isNote
        ? `<span class="res-note-text">${esc(r.title)}</span>`
        : `<a class="res-link" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title||r.url)}</a>`;
      return `<div class="res-item">
        <span class="res-type-badge ${cls}">${label}</span>
        ${linkOrNote}
        <div class="res-actions">
          <button class="res-action-btn edit" title="Edit" onclick="editResource('${moduleId}','${r.id}')">✏️</button>
          <button class="res-action-btn del"  title="Delete" onclick="deleteResource('${moduleId}','${r.id}')">🗑️</button>
        </div>
      </div>`;
    }).join('') + `</div>`;
  }
  html += `<button class="add-res-btn" onclick="showAddResForm('${moduleId}')">+ Add Resource</button>`;
  html += `<div id="res-form-${moduleId}"></div>`;
  return html;
}

function showAddResForm(moduleId, existing) {
  const container = document.getElementById(`res-form-${moduleId}`);
  if (!container) return;
  const isEdit = !!existing;
  // Default type: video (for new), otherwise existing type
  const defaultType = existing?.type || 'video';
  container.innerHTML = `
    <div class="res-form" id="rf-${moduleId}">
      <div class="res-form-row">
        <div>
          <label class="rf-label">Title</label>
          <input class="rf-input" id="rf-title-${moduleId}" placeholder="e.g. Python Tutorial" value="${esc(existing?.title||'')}">
        </div>
        <div>
          <label class="rf-label">Type</label>
          <select class="rf-select" id="rf-type-${moduleId}">
            ${RES_TYPES.map(t=>`<option value="${t}"${defaultType===t?' selected':''}>${RT_LABELS[t]}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="res-form-full">
        <label class="rf-label">URL <span style="color:var(--text-dim)">(optional for notes)</span></label>
        <input class="rf-input" id="rf-url-${moduleId}" placeholder="https://…" value="${esc(existing?.url||'')}">
      </div>
      <div class="res-form-actions">
        <button class="rfbtn rfbtn-cancel" onclick="cancelResForm('${moduleId}')">Cancel</button>
        <button class="rfbtn rfbtn-add" onclick="commitResource('${moduleId}','${existing?.id||''}')">
          ${isEdit ? 'Update' : 'Add Resource'}
        </button>
      </div>
    </div>`;
}

function cancelResForm(moduleId) {
  const c = document.getElementById(`res-form-${moduleId}`);
  if (c) c.innerHTML = '';
}

function commitResource(moduleId, editId) {
  const title = document.getElementById(`rf-title-${moduleId}`)?.value.trim();
  const url   = document.getElementById(`rf-url-${moduleId}`)?.value.trim();
  const type  = document.getElementById(`rf-type-${moduleId}`)?.value;
  if (!title && !url) { showToast('Enter a title or URL', 'error'); return; }
  const resources = loadResources();
  if (!resources[moduleId]) resources[moduleId] = [];
  if (editId) {
    const idx = resources[moduleId].findIndex(r=>r.id===editId);
    if (idx>-1) resources[moduleId][idx] = { id:editId, title:title||url, url, type };
  } else {
    resources[moduleId].push({ id:'R'+Date.now(), title:title||url, url, type });
  }
  saveLocalResources(resources);
  const panel = document.getElementById(`res-panel-${moduleId}`);
  if (panel) renderResourcePanel(moduleId, panel);
  showToast(editId ? 'Resource updated' : 'Resource added', 'success');
}

function editResource(moduleId, resId) {
  const resources = loadResources();
  const existing  = (resources[moduleId]||[]).find(r=>r.id===resId);
  if (!existing) return;
  showAddResForm(moduleId, existing);
}

function deleteResource(moduleId, resId) {
  if (!confirm('Delete this resource?')) return;
  const resources = loadResources();
  resources[moduleId] = (resources[moduleId]||[]).filter(r=>r.id!==resId);
  saveLocalResources(resources);
  const panel = document.getElementById(`res-panel-${moduleId}`);
  if (panel) renderResourcePanel(moduleId, panel);
  showToast('Resource deleted', 'info');
}

// ═══════════════════════════════════════════
//  PHASE STATE UPDATE
// ═══════════════════════════════════════════
function updatePhaseState(card) {
  if (!card) return;
  const cbs  = card.querySelectorAll('.task-cb');
  const done = [...cbs].filter(c=>c.checked).length;
  const tot  = cbs.length;
  const pct  = tot ? Math.round(done/tot*100) : 0;
  const state= tot===0?'notstarted':done===tot?'done':done>0?'active':'notstarted';
  card.dataset.state = state;

  const ring      = card.querySelector('.phase-ring');
  const ringFill  = card.querySelector('.phase-ring-fill');
  const ringLabel = card.querySelector('.phase-ring-label');
  const ringC     = 97.4;
  if (ring)      ring.classList.toggle('is-done', state === 'done');
  if (ringFill)  ringFill.style.strokeDashoffset = tot === 0 ? ringC : ringC - (pct/100) * ringC;
  if (ringLabel) ringLabel.textContent = `${done}/${tot}`;
  if (ring)      ring.title = `${done} of ${tot} tasks complete`;
}

// ═══════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════
function updateDashboard() {
  const all   = document.querySelectorAll('.task-cb');
  const done  = [...all].filter(c=>c.checked).length;
  const tot   = all.length;
  const pct   = tot ? Math.round(done/tot*100) : 0;

  const overallPct  = document.getElementById('overall-pct');
  const overallFill = document.getElementById('overall-fill');
  const dashDone    = document.getElementById('dash-done');
  const dashRemain  = document.getElementById('dash-remain');
  if (overallPct)  overallPct.textContent  = pct+'%';
  if (overallFill) overallFill.style.width = pct+'%';
  if (dashDone)    dashDone.textContent    = done;
  if (dashRemain)  dashRemain.textContent  = tot-done;

  const resources = loadResources();
  let totalResources = 0;
  const modulesWithResources = new Set();
  Object.entries(resources).forEach(([modId, list]) => {
    if (list && list.length > 0) {
      totalResources += list.length;
      modulesWithResources.add(modId);
    }
  });
  const dashResources = document.getElementById('dash-resources');
  if (dashResources) dashResources.textContent = totalResources;

  const allModuleIds = new Set();
  document.querySelectorAll('[data-res-module-id]').forEach(el => {
    allModuleIds.add(el.dataset.resModuleId);
  });
  const pendingCount = [...allModuleIds].filter(id => !modulesWithResources.has(id)).length;
  const dashPending = document.getElementById('dash-pending');
  if (dashPending) dashPending.textContent = pendingCount;

  updateActionBar();
  if (_activeRoadmap) updateRvStats();
}

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); }
  catch { return iso; }
}

// ═══════════════════════════════════════════
//  FILTER
// ═══════════════════════════════════════════
let _filter = 'all';
function setFilter(f, btn) {
  _filter = f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  applyCurrentFilter();
}
function onSearchInput() {
  const q = document.getElementById('search')?.value||'';
  const btn = document.getElementById('search-clear');
  if (btn) btn.classList.toggle('visible', q.length > 0);
  applyCurrentFilter();
}
function clearSearch() {
  const inp = document.getElementById('search');
  if (inp) { inp.value = ''; inp.focus(); }
  const btn = document.getElementById('search-clear');
  if (btn) btn.classList.remove('visible');
  applyCurrentFilter();
}
function applyCurrentFilter() {
  const q = (document.getElementById('search')?.value||'').trim().toLowerCase();
  let any = false;
  document.querySelectorAll('.phase-card').forEach(card => {
    const stateMatch = _filter==='all' || card.dataset.state===_filter;
    let searchMatch  = true;
    if (q) {
      const title = card.querySelector('.phase-name')?.textContent.toLowerCase()||'';
      const tasks = [...card.querySelectorAll('.task-text')].some(t=>t.textContent.toLowerCase().includes(q));
      searchMatch = tasks || title.includes(q);
    }
    const show = stateMatch && searchMatch;
    card.style.display = show ? '' : 'none';
    if (show) any = true;
    if (show && (q || _filter!=='all')) card.classList.add('open');
  });
  const noRes = document.getElementById('no-results');
  if (noRes) noRes.style.display = any ? 'none' : 'block';
}

// ═══════════════════════════════════════════
//  ACCORDION
// ═══════════════════════════════════════════
function togglePhase(card)    { card.classList.toggle('open'); }
function toggleModule(group)  { group.classList.toggle('open'); }
function expandAll()  {
  document.querySelectorAll('.phase-card').forEach(c=>c.classList.add('open'));
  document.querySelectorAll('.module-group').forEach(m=>m.classList.add('open'));
}
function collapseAll(){
  document.querySelectorAll('.phase-card').forEach(c=>c.classList.remove('open'));
  document.querySelectorAll('.module-group').forEach(m=>m.classList.remove('open'));
}
function toggleMoreMenu() { document.getElementById('more-menu')?.classList.toggle('open'); }
function closeMoreMenu()  { document.getElementById('more-menu')?.classList.remove('open'); }
document.addEventListener('click', e => {
  if (!e.target.closest('#more-btn')&&!e.target.closest('#more-menu')) closeMoreMenu();
});

// ═══════════════════════════════════════════
//  KEYBOARD SHORTCUTS
//  Ctrl+S / Cmd+S → Save to Gist
// ═══════════════════════════════════════════
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveToGist();
  }
});

// ═══════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════
function esc(s='') { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function mkEl(tag,cls,text) { const e=document.createElement(tag); if(cls)e.className=cls; if(text)e.textContent=text; return e; }

// ═══════════════════════════════════════════
//  CATALOG PARSER
//  Reads config/catalog.md
//  Supported formats per line:
//    path/to/ROADMAP.md | Title | Badge | Subtitle
//    path/to/ROADMAP.md | Title | Badge
//    path/to/ROADMAP.md | Title
//    path/to/ROADMAP.md          ← title inferred from path
//  Lines starting with # or empty are ignored.
// ═══════════════════════════════════════════
function parseCatalog(md) {
  return md.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const parts = l.split('|').map(p => p.trim());
      const path     = parts[0];
      const title    = parts[1] || path.split('/').slice(-2,-1)[0]?.replace(/-/g,' ') || path;
      const badge    = parts[2] || '📄';
      const subtitle = parts[3] || '';
      // ID: last two meaningful path segments, slugified
      const segs = path.replace(/\/ROADMAP\.md$/i,'').split('/').filter(Boolean);
      const id   = segs.slice(-2).join('-').toLowerCase().replace(/[^a-z0-9]+/g,'-');
      return { id, path, title, badge, subtitle };
    })
    .filter(e => e.path);
}

// ═══════════════════════════════════════════
//  GO HOME  — back to catalog card view
// ═══════════════════════════════════════════
function goHome() {
  _activeRoadmap = null;
  _dirty = false;
  document.title = 'My Learning Platform';

  // Switch header to home-view
  const hdr = document.getElementById('site-header');
  if (hdr) hdr.className = 'site-header home-view';
  window.scrollTo(0, 0);
  if (window.__resetHeaderScrollState) window.__resetHeaderScrollState();
  const hvContent = document.getElementById('hv-content');
  const rvContent = document.getElementById('rv-content');
  if (hvContent) hvContent.style.display = '';
  if (rvContent) rvContent.style.display = 'none';

  // Hide progress bar in action-bar
  document.getElementById('action-bar')?.classList.add('home-mode');

  // Hide toolbar (filter/search not relevant on home)
  document.querySelector('.sticky-bar').style.display = 'none';

  // Render cards first so DOM is ready, then animate stats in next frame
  renderHomeView();
  updateActionBar();
  syncStickyOffsets();
  // Defer stat rendering by two frames so the ring SVG is visible and
  // laid out before the stroke-dashoffset transition fires.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    renderHomeStats();
    syncStickyOffsets();
  }));
  setTimeout(syncStickyOffsets, 300);
}

// ═══════════════════════════════════════════
//  RENDER HOME STATS  (aggregate across all roadmaps)
// ═══════════════════════════════════════════
function renderHomeStats() {
  let totalTasks = 0, totalDone = 0, totalRes = 0;
  _catalog.forEach(entry => {
    const prog = loadProgress(entry.id);
    const res  = loadResources(entry.id);
    let tasks = 0, done = 0;
    Object.entries(prog).forEach(([k,v]) => {
      if (k.startsWith('__')) return;
      tasks++; if (v) done++;
    });
    // Never opened yet? Fall back to the prefetched real total so the
    // aggregate isn't missing roadmaps the user hasn't visited.
    if (tasks === 0 && _catalogStats[entry.id]) tasks = _catalogStats[entry.id].totalTasks;
    totalTasks += tasks; totalDone += done;
    Object.values(res).forEach(list => { totalRes += (list||[]).length; });
  });
  const pct = totalTasks ? Math.round(totalDone / totalTasks * 100) : 0;

  // Animate the ring
  const circumference = 182;
  const offset = circumference - (pct / 100) * circumference;
  const ringFill = document.getElementById('hv-ring-fill');
  const ringPct  = document.getElementById('hv-ring-pct');
  const ringCap  = document.getElementById('hv-ring-caption');
  if (ringFill) ringFill.style.strokeDashoffset = offset;
  if (ringPct)  ringPct.textContent  = pct + '%';
  if (ringCap)  ringCap.textContent  = `${_catalog.length} roadmap${_catalog.length !== 1 ? 's' : ''}`;

  // Stats strip
  const el = document.getElementById('hv-global-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="hv-stat"><span class="hv-stat-val c-blue">${_catalog.length}</span><span class="hv-stat-lbl">Roadmaps</span></div>
    <div class="hv-stat"><span class="hv-stat-val">${totalTasks}</span><span class="hv-stat-lbl">Total Tasks</span></div>
    <div class="hv-stat"><span class="hv-stat-val c-green">${totalDone}</span><span class="hv-stat-lbl">Completed</span></div>
    <div class="hv-stat"><span class="hv-stat-val c-orange">${totalTasks - totalDone}</span><span class="hv-stat-lbl">Remaining</span></div>
    <div class="hv-stat"><span class="hv-stat-val c-purple">${totalRes}</span><span class="hv-stat-lbl">Resources</span></div>
  `;
}

// ═══════════════════════════════════════════
//  RENDER HOME VIEW  — roadmap cards in main
// ═══════════════════════════════════════════
function renderHomeView() {
  const main = document.getElementById('main-content');
  if (!main) return;

  const cardsHTML = _catalog.map(entry => {
    const prog  = loadProgress(entry.id);
    const res   = loadResources(entry.id);

    let tasks = 0, done = 0;
    Object.entries(prog).forEach(([k,v]) => {
      if (k.startsWith('__')) return;
      tasks++; if (v) done++;
    });
    // Never opened yet? Use the real total fetched up front instead of 0,
    // so the card shows actual scale (e.g. "0/42") rather than looking empty.
    const knownTotal = _catalogStats[entry.id]?.totalTasks;
    if (tasks === 0 && knownTotal) tasks = knownTotal;
    const pct      = tasks ? Math.round(done / tasks * 100) : 0;
    const resCount = Object.values(res).reduce((s,l) => s + (l||[]).length, 0);
    const isDirty  = (() => {
      const lt = prog.__localSaveTime, gt = prog.__gistSyncTime;
      return lt ? (!gt || new Date(lt) > new Date(gt)) : false;
    })();

    const footerStats = [
      done > 0        ? `<span class="rc-stat green">${done} done</span>` : '',
      tasks-done > 0  ? `<span class="rc-stat orange">${tasks-done} left</span>` : '',
      resCount > 0    ? `<span class="rc-stat blue">${resCount} resources</span>` : '',
      isDirty         ? `<span class="rc-stat purple">● unsaved</span>` : '',
    ].filter(Boolean).join('');

    // "Not started" means no progress has ever been saved for this
    // roadmap — distinct from "total task count not yet known".
    const hasLocalProgress = Object.keys(prog).some(k => !k.startsWith('__'));
    const notStarted = !hasLocalProgress;

    // Ring geometry — small ring, circumference for r=15.5 (2*pi*r ≈ 97.4)
    const ringC = 97.4;
    const ringOffset = ringC - (pct/100) * ringC;

    return `
      <div class="roadmap-card" data-roadmap-id="${esc(entry.id)}" onclick="loadRoadmap(this.dataset.roadmapId)">
        <div class="rc-body">
          <div class="rc-header">
            <div class="rc-icon">${entry.badge}</div>
            <div class="rc-meta">
              <div class="rc-title">${esc(entry.title)}</div>
              ${entry.subtitle ? `<div class="rc-subtitle">${esc(entry.subtitle)}</div>` : ''}
            </div>
            <!-- Circular progress ring, same visual language as the home hero ring -->
            <div class="rc-ring${pct===100?' is-done':''}" title="${done} of ${tasks} tasks complete">
              <svg viewBox="0 0 36 36">
                <circle class="rc-ring-bg"   cx="18" cy="18" r="15.5"/>
                <circle class="rc-ring-fill" cx="18" cy="18" r="15.5"
                        stroke-dasharray="${ringC}"
                        stroke-dashoffset="${ringOffset}"/>
              </svg>
              <div class="rc-ring-label">${done}/${tasks}</div>
            </div>
          </div>
        </div>
        <div class="rc-footer">
          ${footerStats || ''}
          ${notStarted ? `<span class="rc-nudge">Start exploring →</span>` : `<span class="rc-stat-spacer"></span>`}
        </div>
      </div>`;
  }).join('');

  main.innerHTML = `
    <div class="home-view-wrap">
      <div class="home-section-label">Your Roadmaps &mdash; ${_catalog.length} available</div>
      <div class="roadmap-cards-grid">${cardsHTML}</div>
    </div>`;
}

// ═══════════════════════════════════════════
//  UPDATE RV STATS  — glassmorphic stats strip in roadmap view header
// ═══════════════════════════════════════════
function updateRvStats() {
  const done   = parseInt(document.getElementById('dash-done')?.textContent   || 0);
  const remain = parseInt(document.getElementById('dash-remain')?.textContent || 0);
  const total  = done + remain;

  // Full glassmorphic stats strip — sections / phases / tasks / completed / remaining
  const strip = document.getElementById('rv-global-stats');
  if (!strip) return;
  strip.innerHTML = `
    <div class="hv-stat"><span class="hv-stat-val c-blue">${_rvStructure.sections}</span><span class="hv-stat-lbl">Sections</span></div>
    <div class="hv-stat"><span class="hv-stat-val">${_rvStructure.phases}</span><span class="hv-stat-lbl">Phases</span></div>
    <div class="hv-stat"><span class="hv-stat-val">${total}</span><span class="hv-stat-lbl">Total Tasks</span></div>
    <div class="hv-stat"><span class="hv-stat-val c-green">${done}</span><span class="hv-stat-lbl">Completed</span></div>
    <div class="hv-stat"><span class="hv-stat-val c-orange">${remain}</span><span class="hv-stat-lbl">Remaining</span></div>
  `;
}

// ═══════════════════════════════════════════
//  SWITCH ROADMAP  (called from home card click or programmatically)
// ═══════════════════════════════════════════
async function switchRoadmap(id) {
  if (_activeRoadmap?.id === id) return;
  const entry = _catalog.find(e => e.id === id);
  if (!entry) return;
  await loadRoadmap(entry);
}

// ═══════════════════════════════════════════
//  LOAD ROADMAP  (fetch + parse + render)
// ═══════════════════════════════════════════
async function loadRoadmap(entry) {
  // entry may arrive as a plain object or as a catalog id string
  if (typeof entry === 'string') entry = _catalog.find(e => e.id === entry);
  if (!entry) {
    showToast('Could not find that roadmap — try reloading the page.', 'error');
    return;
  }

  _activeRoadmap = entry;
  try { localStorage.setItem(KEY_LAST_ACTIVE, entry.id); } catch {}

  // Switch header to roadmap-view
  const hdr = document.getElementById('site-header');
  if (hdr) hdr.className = 'site-header roadmap-view';
  window.scrollTo(0, 0);
  if (window.__resetHeaderScrollState) window.__resetHeaderScrollState();
  const hvContent = document.getElementById('hv-content');
  const rvContent = document.getElementById('rv-content');
  if (hvContent) hvContent.style.display = 'none';
  if (rvContent) rvContent.style.display = '';
  const rvBadge = document.getElementById('rv-badge');
  const rvTitle = document.getElementById('rv-title');
  const rvSubtitle = document.getElementById('rv-subtitle');
  if (rvBadge)    rvBadge.textContent    = entry.badge;
  if (rvTitle)    rvTitle.textContent    = entry.title;
  if (rvSubtitle) rvSubtitle.textContent = entry.subtitle || '';

  // Show action-bar progress row and toolbar
  document.getElementById('action-bar')?.classList.remove('home-mode');
  const stickyBar = document.querySelector('.sticky-bar');
  if (stickyBar) stickyBar.style.display = '';
  syncStickyOffsets();

  // Restore dirty state for this roadmap
  const prog    = loadProgress();
  const localTs = prog.__localSaveTime;
  const gistTs  = prog.__gistSyncTime;
  _dirty = localTs ? (!gistTs || new Date(localTs) > new Date(gistTs)) : false;
  document.title = _dirty ? `● ${entry.title}` : entry.title;

  updateActionBar();

  // Show loading state
  const main = document.getElementById('main-content');
  if (main) main.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Loading roadmap…</p></div>';

  try {
    const res  = await fetchWithTimeout(REPO_BASE + entry.path);
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${entry.path}`);
    const data = parseRoadmap(await res.text());
    if (!data.sections.length) throw new Error('No sections found. Check the ROADMAP.md structure.');
    render(data);
    updateRvStats();
    syncStickyOffsets();
    setTimeout(syncStickyOffsets, 300);
  } catch(e) {
    if (main) main.innerHTML = `<div class="error-state"><strong>⚠ Could not load roadmap</strong><br>${esc(e.message)}<br><br><small style="color:var(--text-muted)">Check the path in config/catalog.md and try again.</small></div>`;
    updateActionBar();
    syncStickyOffsets();
  }
}

// Legacy — no-op now (tabs replaced by home card view)
function renderSelectorTabs() {}

// ═══════════════════════════════════════════
//  PREFETCH CATALOG STATS
//  Computes structural counts (sections / phases / total
//  tasks) for EVERY roadmap in the catalog up front, so home
//  cards can show real numbers before a roadmap is ever opened.
//  Results are cached in localStorage (keyed by a content hash
//  of the markdown) so repeat visits don't re-fetch/re-parse
//  unless the underlying ROADMAP.md actually changed.
// ═══════════════════════════════════════════
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return h.toString(36);
}
function countStructure(data) {
  let totalTasks = 0, totalMods = 0, totalItems = 0;
  data.sections.forEach(sec => {
    (sec.items || []).forEach(item => {
      totalItems++;
      totalTasks += collectTasks(item).length;
      totalMods  += (item.modules || []).length;
    });
  });
  return { sections: data.sections.length, phases: totalItems, modules: totalMods, totalTasks };
}
async function prefetchCatalogStats() {
  await Promise.all(_catalog.map(async entry => {
    try {
      const res = await fetchWithTimeout(REPO_BASE + entry.path);
      if (!res.ok) return;
      const text = await res.text();
      const hash = hashStr(text);

      // Use cache if the markdown hasn't changed since last time.
      const cacheKey = keyTotalCache(entry.id);
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (cached && cached.hash === hash) {
          _catalogStats[entry.id] = cached.stats;
          return;
        }
      } catch {}

      const stats = countStructure(parseRoadmap(text));
      _catalogStats[entry.id] = stats;
      try { localStorage.setItem(cacheKey, JSON.stringify({ hash, stats })); } catch {}
    } catch {
      // Network/parse failure for this one roadmap — just skip it,
      // its card will fall back to locally-saved progress only.
    }
  }));
}

// ═══════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════
async function boot() {
  try {
    const cfg = getCfg();
    const patInput  = document.getElementById('pat-input');
    const gistInput = document.getElementById('gist-input');
    if (cfg.pat && patInput)       patInput.value  = cfg.pat;
    if (cfg.gistId && gistInput)   gistInput.value = cfg.gistId;

    updateActionBar();
    syncStickyOffsets();
    setTimeout(syncStickyOffsets, 100);

    // 1. Fetch and parse the catalog
    try {
      const catRes     = await fetchWithTimeout(REPO_BASE + 'config/catalog.md');
      if (!catRes.ok) throw new Error(`Catalog HTTP ${catRes.status}`);
      _catalog = parseCatalog(await catRes.text());
      if (!_catalog.length) throw new Error('config/catalog.md is empty — add at least one roadmap path.');
    } catch(e) {
      const main = document.getElementById('main-content');
      if (main) main.innerHTML = `
        <div class="home-view-wrap">
          <div class="error-state"><strong>⚠ Could not load catalog</strong><br>${esc(e.message)}<br><br>
          <small style="color:var(--text-muted)">Create <code>config/catalog.md</code> in your repository.</small></div>
        </div>`;
      return;
    }

    // 2. Show home view immediately (uses cached stats if available)
    goHome();

    // 3. Fetch real total-task counts for every roadmap in the background,
    //    then refresh the cards once we know them (covers never-opened roadmaps).
    prefetchCatalogStats().then(() => {
      if (!_activeRoadmap) { renderHomeView(); renderHomeStats(); }
    });
  } catch (e) {
    // Final safety net: ANY unexpected error during boot (e.g. a missing
    // DOM element somewhere we didn't anticipate) shows up here instead
    // of leaving the page frozen on "Loading your roadmap…" forever.
    console.error('boot() failed:', e);
    const main = document.getElementById('main-content');
    if (main) main.innerHTML = `
      <div class="home-view-wrap">
        <div class="error-state"><strong>⚠ Something went wrong while starting the app</strong><br>${esc(e.message)}<br><br>
        <small style="color:var(--text-muted)">Try reloading the page. If this keeps happening, check the browser console for details.</small></div>
      </div>`;
  }
}
// ═══════════════════════════════════════════
//  SYNC STICKY OFFSETS
//  Measures actual header / action-bar heights and
//  stacks the sticky layers (header → action-bar →
//  toolbar) so none of them overlap, regardless of
//  font scaling, screen size, or theme. When the
//  header is auto-hidden (scrolled down), its space
//  is reclaimed so action-bar/toolbar slide up to top:0.
// ═══════════════════════════════════════════
function syncStickyOffsets() {
  const hdr = document.getElementById('site-header');
  const ab  = document.getElementById('action-bar');
  const sb  = document.querySelector('.sticky-bar');
  if (!ab || !sb || !hdr) return;

  // The header is only sticky in roadmap-view; in home-view it scrolls
  // away normally, so the action-bar sits at top:0 on its own.
  const headerIsSticky = hdr.classList.contains('roadmap-view');
  const headerHidden    = hdr.classList.contains('header-hidden');
  const headerH = (headerIsSticky && !headerHidden) ? Math.ceil(hdr.getBoundingClientRect().height) : 0;

  ab.style.top = headerH + 'px';
  const abH = Math.ceil(ab.getBoundingClientRect().height);
  sb.style.top = (headerH + abH) + 'px';
}
// Run on load and whenever the window resizes
window.addEventListener('resize', syncStickyOffsets);

// ═══════════════════════════════════════════
//  AUTO-HIDE HEADER ON SCROLL (roadmap view only)
//  Scrolling down hides the gradient header band to
//  reclaim space; scrolling up reveals it again.
//  Action-bar + toolbar stay pinned at all times.
// ═══════════════════════════════════════════
(function () {
  let lastY = window.scrollY || 0;
  let ticking = false;
  const HIDE_THRESHOLD = 8;     // ignore tiny jitters
  const MIN_Y_TO_HIDE  = 40;    // don't hide until scrolled a bit past the top

  window.__resetHeaderScrollState = function () {
    lastY = window.scrollY || 0;
    const hdr = document.getElementById('site-header');
    if (hdr) hdr.classList.remove('header-hidden');
  };

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const hdr = document.getElementById('site-header');
      if (hdr && hdr.classList.contains('roadmap-view')) {
        const y = window.scrollY || 0;
        const delta = y - lastY;
        if (y <= MIN_Y_TO_HIDE) {
          hdr.classList.remove('header-hidden');
        } else if (delta > HIDE_THRESHOLD) {
          hdr.classList.add('header-hidden');
        } else if (delta < -HIDE_THRESHOLD) {
          hdr.classList.remove('header-hidden');
        }
        syncStickyOffsets();
        lastY = y;
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
})();

document.addEventListener('DOMContentLoaded', boot);

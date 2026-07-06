'use strict';

// ═══════════════════════════════════════════
//  REPO BASE URL
//  Points to the branch all content is served from.
//  Change this one line when merging to main.
// ═══════════════════════════════════════════
const REPO_BASE = 'https://raw.githubusercontent.com/NaveenKadali/learning-journey-organizer/feature/multi-roadmap/';

// Derive { owner, repo, branch } from REPO_BASE so the markdown editor can
// call the GitHub Contents API without a second hardcoded constant to keep
// in sync. Branch names can contain slashes (e.g. "feature/multi-roadmap"),
// so everything after owner/repo is treated as the branch.
function getRepoInfo() {
  const u = new URL(REPO_BASE);
  const segs = u.pathname.split('/').filter(Boolean);
  return { owner: segs[0], repo: segs[1], branch: segs.slice(2).join('/') };
}

// GitHub's Contents API speaks base64. atob/btoa alone mangle anything
// outside Latin-1 (emoji, arrows, etc.), so route through TextEncoder/
// TextDecoder to round-trip UTF-8 content correctly.
function b64DecodeUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
function b64EncodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

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
let _mdEditorState  = null; // { path, sha, originalText } for the raw markdown editor, while open

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
  if (e.target.classList.contains('modal-overlay')) {
    if (e.target.id === 'md-editor-modal') { closeMarkdownEditor(); return; }
    e.target.classList.remove('open');
  }
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
//  RAW MARKDOWN EDITOR
//  Lets the active roadmap's ROADMAP.md be edited and committed straight
//  to GitHub via the Contents API, using the same PAT already collected
//  for Gist sync (it just needs the broader "repo" scope to write files,
//  not only "gist").
// ═══════════════════════════════════════════
async function openMarkdownEditor() {
  const cfg = getCfg();
  if (!cfg.pat) { openModal('settings-modal'); showToast('Add a GitHub PAT first (Settings) — it needs "repo" scope to save edits', 'info'); return; }
  if (!_activeRoadmap) { showToast('Open a roadmap first', 'info'); return; }

  const ta       = document.getElementById('md-editor-textarea');
  const titleEl  = document.getElementById('md-editor-title');
  const statusEl = document.getElementById('md-editor-status');
  const saveBtn  = document.getElementById('md-editor-save-btn');
  _mdEditorState = null;
  ta.value = '';
  ta.disabled = true;
  saveBtn.disabled = true;
  titleEl.textContent = `✎ Edit — ${_activeRoadmap.title}`;
  statusEl.textContent = 'Loading current content from GitHub…';
  statusEl.style.color = '';
  mdFindClose();
  openModal('md-editor-modal');

  try {
    const { owner, repo, branch } = getRepoInfo();
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${_activeRoadmap.path}?ref=${encodeURIComponent(branch)}`,
      { headers: { Authorization: `token ${cfg.pat}` } }
    );
    if (res.status === 401 || res.status === 403) {
      throw new Error('GitHub rejected this request — your PAT may be missing "repo" scope (Gist-only scope isn\'t enough to read/write repo files).');
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status}${res.status === 404 ? ' — file not found at this path/branch' : ''}`);
    const data = await res.json();
    const text = b64DecodeUtf8(data.content);
    _mdEditorState = { path: _activeRoadmap.path, sha: data.sha, originalText: text };
    ta.value = text;
    ta.disabled = false;
    saveBtn.disabled = false;
    statusEl.textContent = `Editing ${_activeRoadmap.path} on branch "${branch}". Saving commits directly to GitHub.`;
  } catch (e) {
    statusEl.textContent = `⚠ Could not load file: ${e.message}`;
    statusEl.style.color = 'var(--c-reset)';
  }
}

function closeMarkdownEditor(force) {
  const ta = document.getElementById('md-editor-textarea');
  if (!force && _mdEditorState && ta.value !== _mdEditorState.originalText) {
    if (!confirm('Discard unsaved edits?')) return;
  }
  document.getElementById('md-find-bar')?.classList.remove('open');
  _mdFindState = { matches: [], idx: -1, query: '' };
  closeModal('md-editor-modal');
  _mdEditorState = null;
}

async function saveMarkdownEdits() {
  const cfg = getCfg();
  if (!cfg.pat) { openModal('settings-modal'); return; }
  if (!_mdEditorState) { showToast('Nothing loaded to save yet', 'error'); return; }

  const ta = document.getElementById('md-editor-textarea');
  const newText = ta.value;

  if (newText === _mdEditorState.originalText) {
    showToast('No changes to save', 'info');
    return;
  }

  // Validate locally before committing anything — a save that produces a
  // structurally empty roadmap is almost certainly a mistake, not intent.
  const parsed = parseRoadmap(newText);
  if (!parsed.sections.length) {
    showToast('No phases (##) found in the edited markdown — check it before saving', 'error');
    return;
  }

  const btn = document.getElementById('md-editor-save-btn');
  const statusEl = document.getElementById('md-editor-status');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const { owner, repo, branch } = getRepoInfo();
    const msgInput = document.getElementById('md-editor-commit-msg');
    const message  = (msgInput?.value || '').trim() || `Update ${_mdEditorState.path} via roadmap editor`;
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${_mdEditorState.path}`, {
      method: 'PUT',
      headers: { Authorization: `token ${cfg.pat}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: b64EncodeUtf8(newText),
        sha: _mdEditorState.sha,
        branch
      })
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error('GitHub rejected this request — your PAT may be missing "repo" scope.');
    }
    if (res.status === 409) {
      throw new Error('File changed on GitHub since you opened it — close and reopen the editor to get the latest version, then redo your edits.');
    }
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `GitHub API ${res.status}`);
    }
    const result = await res.json();
    _mdEditorState.sha          = result.content.sha;
    _mdEditorState.originalText = newText;
    if (msgInput) msgInput.value = '';

    // Render straight from what was just committed — raw.githubusercontent.com
    // is CDN-cached for a few minutes, so re-fetching it here could still
    // show the pre-edit version.
    render(parsed);
    updateRvStats();
    syncStickyOffsets();

    showToast('✓ Saved to GitHub', 'success');
    closeMarkdownEditor(true);
  } catch (e) {
    statusEl.textContent = `⚠ ${e.message}`;
    statusEl.style.color = 'var(--c-reset)';
    showToast(`Save failed: ${e.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save to GitHub';
  }
}

// ═══════════════════════════════════════════
//  FIND & REPLACE (markdown editor)
//  A textarea's content is form-control value, not rendered DOM text, so
//  the browser's native Ctrl+F can't search it — this implements find/
//  replace directly against the textarea value, with explicit next/
//  previous navigation (not just jump-to-first) and a position counter,
//  using selection + manual scroll since textareas can't highlight
//  multiple matches at once the way a real code editor can.
// ═══════════════════════════════════════════
let _mdFindState = { matches: [], idx: -1, query: '' };

function mdFindOpen() {
  const bar = document.getElementById('md-find-bar');
  bar.classList.add('open');
  const input = document.getElementById('md-find-input');
  input.focus();
  input.select();
}
function mdFindClose() {
  document.getElementById('md-find-bar')?.classList.remove('open');
  _mdFindState = { matches: [], idx: -1, query: '' };
  mdFindUpdateCounter();
  document.getElementById('md-editor-textarea')?.focus();
}

// Typing alone does NOT search — it only clears the now-stale match count,
// so the counter doesn't claim a result for text that hasn't been searched
// yet. The actual scan only runs on an explicit action: Enter, or the ▲/▼
// buttons (see mdFindTriggerNext/Prev below).
function mdFindInputChanged() {
  _mdFindState.matches = [];
  _mdFindState.idx = -1;
  const el = document.getElementById('md-find-counter');
  if (el) el.textContent = '';
}

function mdFindUpdateMatches() {
  const ta = document.getElementById('md-editor-textarea');
  const q  = document.getElementById('md-find-input').value;
  _mdFindState.query = q;
  _mdFindState.matches = [];
  _mdFindState.idx = -1;
  if (!q) { mdFindUpdateCounter(); return; }
  const text = ta.value.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  while (true) {
    const found = text.indexOf(needle, i);
    if (found === -1) break;
    _mdFindState.matches.push(found);
    i = found + needle.length;
  }
  // Jump to the match nearest the current cursor, not always the first —
  // feels more like "find from here" than restarting at the top every time.
  if (_mdFindState.matches.length) {
    const cursor = ta.selectionStart || 0;
    let nearest = _mdFindState.matches.findIndex(p => p >= cursor);
    if (nearest === -1) nearest = 0;
    mdFindGoTo(nearest);
  } else {
    mdFindUpdateCounter();
  }
}

function mdFindGoTo(idx) {
  const ta = document.getElementById('md-editor-textarea');
  const m  = _mdFindState.matches;
  if (!m.length) { mdFindUpdateCounter(); return; }
  _mdFindState.idx = ((idx % m.length) + m.length) % m.length; // wraps both directions
  const start = m[_mdFindState.idx];
  const end   = start + _mdFindState.query.length;
  ta.focus();
  ta.setSelectionRange(start, end);
  mdScrollSelectionIntoView(ta, start);
  mdFindUpdateCounter();
}
function mdFindNext() { mdFindGoTo(_mdFindState.idx + 1); }
function mdFindPrev() { mdFindGoTo(_mdFindState.idx - 1); }

// Entry points for Enter / ▼ / ▲: scan only if the box's text doesn't match
// what was last searched (first search, or the query was edited since);
// otherwise just step to the next/previous already-found match. This is
// what makes search "manual" — nothing happens just from typing.
function mdFindTriggerNext() {
  const q = document.getElementById('md-find-input').value;
  if (q !== _mdFindState.query) mdFindUpdateMatches();
  else mdFindNext();
}
function mdFindTriggerPrev() {
  const q = document.getElementById('md-find-input').value;
  if (q !== _mdFindState.query) mdFindUpdateMatches();
  else mdFindPrev();
}

function mdFindUpdateCounter() {
  const el = document.getElementById('md-find-counter');
  if (!el) return;
  el.textContent = _mdFindState.matches.length
    ? `${_mdFindState.idx + 1}/${_mdFindState.matches.length}`
    : (_mdFindState.query ? '0/0' : '');
}

// Textareas don't auto-scroll to a programmatic selection — estimate the
// selection's line position from line-height and nudge scrollTop so it's
// actually visible, rather than just selecting text off-screen.
function mdScrollSelectionIntoView(ta, pos) {
  const lineNum    = ta.value.substring(0, pos).split('\n').length - 1;
  const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 18;
  const target     = lineNum * lineHeight;
  const visibleH   = ta.clientHeight;
  if (target < ta.scrollTop || target > ta.scrollTop + visibleH - lineHeight) {
    ta.scrollTop = Math.max(0, target - visibleH / 2);
  }
}

function mdReplaceCurrent() {
  const ta = document.getElementById('md-editor-textarea');
  const replaceVal = document.getElementById('md-replace-input').value;
  const m = _mdFindState.matches;
  if (!_mdFindState.query) return;
  if (_mdFindState.idx < 0 || !m.length) { mdFindUpdateMatches(); return; }
  const start = m[_mdFindState.idx];
  const end   = start + _mdFindState.query.length;
  ta.setRangeText(replaceVal, start, end, 'end');
  mdFindUpdateMatches();
}

function mdReplaceAll() {
  const ta = document.getElementById('md-editor-textarea');
  const q  = document.getElementById('md-find-input').value;
  const replaceVal = document.getElementById('md-replace-input').value;
  if (!q) return;
  const count = _mdFindState.matches.length;
  if (!count) { showToast('No matches to replace', 'info'); return; }
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  const cursor = ta.selectionStart;
  ta.value = ta.value.replace(re, replaceVal);
  ta.setSelectionRange(cursor, cursor);
  showToast(`Replaced ${count} occurrence${count === 1 ? '' : 's'}`, 'success');
  mdFindUpdateMatches();
}

function mdFindInputKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? mdFindTriggerPrev() : mdFindTriggerNext(); }
  else if (e.key === 'Escape') { e.preventDefault(); mdFindClose(); }
}
// Ctrl/Cmd+F inside the editor opens our find bar instead of the browser's
// native in-page find, which can't search textarea content anyway.
function mdEditorKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault();
    mdFindOpen();
  } else if (e.key === 'Escape') {
    const bar = document.getElementById('md-find-bar');
    if (bar && bar.classList.contains('open')) { e.preventDefault(); mdFindClose(); }
  }
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

// Two headings (or two tasks) with identical text would otherwise collide
// on the same slug — e.g. a "Learn" submodule repeated under every module
// all becoming id="learn". That's not just cosmetic: it means duplicate
// DOM ids, so getElementById-based lookups (resource panels, pills, counts)
// for every occurrence after the first silently act on the *first* one
// instead. uniqueSlug appends a disambiguating suffix only when a collision
// actually happens, so every other id is completely unaffected.
let _idSeenNodes = new Map();
let _idSeenTasks = new Map();
function uniqueSlug(seenMap, title) {
  const base = slug(title);
  const n = (seenMap.get(base) || 0) + 1;
  seenMap.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}

// Every level (phase / module / submodule / topic) shares the same shape,
// which is what lets rendering and task-collection recurse generically
// instead of having one hand-written function per heading depth.
function makeNode(title) {
  return { title, id: uniqueSlug(_idSeenNodes, title), modules: [], tasks: [], _blocks: [] };
}
function makeSection(label) {
  return { label, items: [], _blocks: [] };
}

// simple = exactly one paragraph → rendered as an inline muted caption at
//          phase/module/submodule/topic level (no toggle needed for one line)
// rich   = anything more (list, code fence, 2+ paragraphs) → Notes box
// Section-level content always goes through renderSupporting (Notes box)
// regardless of shape — see buildSectionAccordion.
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
  _idSeenNodes = new Map();
  _idSeenTasks = new Map();
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
    taskArr.push({ text: m[2].trim(), checked, id: uniqueSlug(_idSeenTasks, m[2].trim()) });
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
// Used for the roadmap-level overview and section dividers — both are
// "supporting content with no parent accordion to nest inside," so unlike
// the phase/module Notes panel (which stays closed to protect the
// checklist), this defaults OPEN, same as submodules/topics do — it's
// still a real collapsible wrapped to its own heading row, just not
// hidden by default since there's no checklist here to protect.
// Used only for the roadmap-level overview (no section label to attach to).
// Returns a ready-to-append DOM element.
function buildRoadmapOverviewEl(supporting) {
  const el = document.createElement('div');
  el.className = 'roadmap-overview-wrap';
  el.innerHTML = renderSupporting(supporting, 'roadmap');
  return el;
}

// Section accordion — the section label IS the collapsible header, and all
// phase-cards for that section live inside its body. Default: open.
// phaseListEl is a pre-built .phase-list DOM node.
function buildSectionAccordion(section, secIdx, phaseListEl) {
  const phaseCount = (section.items || []).length;
  const taskCount  = (section.items || []).reduce((s, item) => s + collectTasks(item).length, 0);
  const progress   = loadProgress();
  const doneTasks  = (section.items || []).reduce((s, item) => {
    return s + collectTasks(item).filter(t => progress[t.id] === true || t.checked).length;
  }, 0);
  const pct = taskCount > 0 ? Math.round(doneTasks / taskCount * 100) : 0;

  const acc = document.createElement('div');
  acc.className = 'section-accordion open';
  acc.id = 'sa-' + secIdx;
  const chevron = `<svg class="section-acc-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;

  // The progress track lives inside the header row so .section-acc-body
  // stays a direct child of .section-accordion — that's required for the
  // open > .section-acc-body CSS selector (and the expand/collapse JS) to work.
  acc.innerHTML = `
    <div class="section-acc-header" onclick="toggleSection(this.parentElement)">
      <div class="section-acc-left">
        <div class="section-acc-title-row">
          <span class="section-acc-label">${esc(section.label)}</span>
          <span class="section-acc-stats">${phaseCount} phase${phaseCount !== 1 ? 's' : ''}</span>
          ${chevron}
        </div>
        <div class="section-acc-track"><div class="section-acc-fill" style="width:${pct}%"></div></div>
      </div>
      <span class="section-acc-fraction">${doneTasks}/${taskCount}</span>
    </div>
    <div class="section-acc-body"></div>`;

  const body = acc.querySelector('.section-acc-body');
  if (section.overview) {
    // Section-level overview always goes through the Notes box —
    // raw text never floats directly under a section header.
    const richOverview = section.overview.kind === 'simple'
      ? { kind: 'rich', blocks: [{ type: 'p', text: section.overview.text }] }
      : section.overview;
    const notesWrap = document.createElement('div');
    notesWrap.innerHTML = renderSupporting(richOverview, 'sec-' + secIdx);
    body.appendChild(notesWrap.firstElementChild);
  }
  body.appendChild(phaseListEl);
  return acc;
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
  if ((node.tasks || []).length) html += resSection(node.id, resources);
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

  // Roadmap-level overview — standalone Notes box above all sections.
  if (data.overview) main.appendChild(buildRoadmapOverviewEl(data.overview));

  data.sections.forEach((section, secIdx) => {
    // Build phase cards
    const phaseList = mkEl('div', 'phase-list');
    (section.items || []).forEach(item => {
      const meta = nextMeta();
      phaseList.appendChild(buildCard(item, progress, resources, meta, ''));
    });

    if (section.label) {
      // Named section → full collapsible accordion wrapping the phase-list
      main.appendChild(buildSectionAccordion(section, secIdx, phaseList));
    } else {
      // Implicit section (no label) → just the phase-list, no wrapper
      main.appendChild(phaseList);
    }
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

  // Section accordions: hide the whole accordion if none of its phases are
  // visible, and auto-expand it if any are (so a match is never hiding
  // inside a collapsed section the user just filtered for).
  document.querySelectorAll('.section-accordion').forEach(acc => {
    const visible = [...acc.querySelectorAll('.phase-card')].some(c => c.style.display !== 'none');
    acc.style.display = visible ? '' : 'none';
    if (visible && (q || _filter !== 'all')) acc.classList.add('open');
  });

  const noRes = document.getElementById('no-results');
  if (noRes) noRes.style.display = any ? 'none' : 'block';
}

// ═══════════════════════════════════════════
//  ACCORDION
// ═══════════════════════════════════════════
// Each of these three toggles behaves as an accordion: opening one
// closes every sibling at the same level (same parent), so at most one
// section / one phase-card (per section) / one module-group (per parent)
// is ever open at a time. Clicking an already-open item just closes it.

// Sections are all siblings directly under #main-content (or under the
// roadmap overview wrap), so "siblings" = every other .section-accordion
// in the whole roadmap view.
function toggleSection(acc) {
  const willOpen = !acc.classList.contains('open');
  document.querySelectorAll('.section-accordion.open').forEach(other => {
    if (other !== acc) other.classList.remove('open');
  });
  acc.classList.toggle('open', willOpen);
}

// Phases are siblings within the same .phase-list (i.e. the same
// section), so only close other phase-cards that share this card's
// direct parent — phases in a different section are untouched.
function togglePhase(card) {
  const willOpen = !card.classList.contains('open');
  const siblings = card.parentElement ? card.parentElement.querySelectorAll(':scope > .phase-card') : [];
  siblings.forEach(sib => { if (sib !== card) sib.classList.remove('open'); });
  card.classList.toggle('open', willOpen);
}

// Modules (and submodules/topics, which reuse .module-group at deeper
// levels) are siblings within whichever body they're nested in — close
// only the other module-groups sharing this group's direct parent.
function toggleModule(group) {
  const willOpen = !group.classList.contains('open');
  const siblings = group.parentElement ? group.parentElement.querySelectorAll(':scope > .module-group') : [];
  siblings.forEach(sib => { if (sib !== group) sib.classList.remove('open'); });
  group.classList.toggle('open', willOpen);
}
function expandAll()  {
  document.querySelectorAll('.section-accordion').forEach(s=>s.classList.add('open'));
  document.querySelectorAll('.phase-card').forEach(c=>c.classList.add('open'));
  document.querySelectorAll('.module-group').forEach(m=>m.classList.add('open'));
}
function collapseAll(){
  document.querySelectorAll('.section-accordion').forEach(s=>s.classList.remove('open'));
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
  const entries = [];
  md.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .forEach(l => {
      // Skip markdown-table-divider-style lines (e.g. "---|---|---|---")
      // — these sometimes get left in from a header/template the row was
      // copied from, and aren't real catalog entries.
      if (/^[\s|:-]+$/.test(l)) {
        console.warn('[catalog] skipped divider-style line:', l);
        return;
      }
      const parts = l.split('|').map(p => p.trim());
      const path     = parts[0];
      const title    = parts[1] || path.split('/').slice(-2,-1)[0]?.replace(/-/g,' ') || path;
      const badge    = parts[2] || '📄';
      const subtitle = parts[3] || '';
      // ID: last two meaningful path segments, slugified
      const segs = path.replace(/\/ROADMAP\.md$/i,'').split('/').filter(Boolean);
      const id   = segs.slice(-2).join('-').toLowerCase().replace(/[^a-z0-9]+/g,'-');

      // A real entry must point at an actual markdown file and have a
      // real title. This is what catches incomplete/placeholder rows
      // (a blank or dash/underscore-only field in any column) here —
      // before one ever reaches the UI as a broken "ghost" card with a
      // default icon, an unreadable title, and 0/0 tasks.
      if (!path || !/\.md$/i.test(path)) {
        console.warn('[catalog] skipped entry with invalid path:', l);
        return;
      }
      if (!title || /^[\s\-–—_.]+$/.test(title)) {
        console.warn('[catalog] skipped entry with placeholder/empty title:', l);
        return;
      }
      entries.push({ id, path, title, badge, subtitle });
    });
  return entries;
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
//  font scaling, screen size, or theme. When a layer
//  is auto-hidden (scrolled down), its space is
//  reclaimed so the layer(s) below it slide up.
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
  const abHidden = ab.classList.contains('bar-hidden');
  const abH = abHidden ? 0 : Math.ceil(ab.getBoundingClientRect().height);
  sb.style.top = (headerH + abH) + 'px';
}
// Run on load and whenever the window resizes
window.addEventListener('resize', syncStickyOffsets);

// ═══════════════════════════════════════════
//  AUTO-HIDE SCROLL STACK (roadmap view only)
//  Scrolling down hides the header, the action-bar
//  (dashboard: theme/save/sync/settings + progress),
//  and the toolbar (filters/search) together, to
//  reclaim screen space. Scrolling up reveals the
//  whole stack again. They move as one unit so the
//  stack never looks like it's partially open.
// ═══════════════════════════════════════════
(function () {
  let lastY = window.scrollY || 0;
  let ticking = false;
  const HIDE_THRESHOLD = 8;     // ignore tiny jitters
  const MIN_Y_TO_HIDE  = 40;    // don't hide until scrolled a bit past the top

  window.__resetHeaderScrollState = function () {
    lastY = window.scrollY || 0;
    const hdr = document.getElementById('site-header');
    const ab  = document.getElementById('action-bar');
    const sb  = document.querySelector('.sticky-bar');
    if (hdr) hdr.classList.remove('header-hidden');
    if (ab)  ab.classList.remove('bar-hidden');
    if (sb)  sb.classList.remove('bar-hidden');
  };

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const hdr = document.getElementById('site-header');
      if (hdr && hdr.classList.contains('roadmap-view')) {
        const ab = document.getElementById('action-bar');
        const sb = document.querySelector('.sticky-bar');
        const y = window.scrollY || 0;
        const delta = y - lastY;
        if (y <= MIN_Y_TO_HIDE) {
          hdr.classList.remove('header-hidden');
          if (ab) ab.classList.remove('bar-hidden');
          if (sb) sb.classList.remove('bar-hidden');
        } else if (delta > HIDE_THRESHOLD) {
          hdr.classList.add('header-hidden');
          if (ab) ab.classList.add('bar-hidden');
          if (sb) sb.classList.add('bar-hidden');
        } else if (delta < -HIDE_THRESHOLD) {
          hdr.classList.remove('header-hidden');
          if (ab) ab.classList.remove('bar-hidden');
          if (sb) sb.classList.remove('bar-hidden');
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

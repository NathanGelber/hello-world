const STORAGE_KEY = "mattewrite-state-v2";

const FONT_OPTIONS = [
  { label: "Source Sans 3", stack: '"Source Sans 3", "Inter", system-ui, -apple-system, sans-serif' },
  { label: "Inter", stack: '"Inter", system-ui, -apple-system, sans-serif' },
  { label: "Lora", stack: '"Lora", Georgia, serif' },
  { label: "Literata", stack: '"Literata", Georgia, serif' },
  { label: "Alegreya", stack: '"Alegreya", Georgia, serif' },
  { label: "IBM Plex Sans", stack: '"IBM Plex Sans", "Segoe UI", sans-serif' }
];

const THEMES = {
  cream: { name: "Cream", bg: "#f6e9d8", panel: "#efdfc9", text: "#2a241e", muted: "#6f6458", accent: "#b8875b", border: "rgba(60,40,20,.18)", editor: "#f3e4cf" },
  ftpink: { name: "FT Pink", bg: "#fff1e5", panel: "#f8e3d1", text: "#2b211b", muted: "#6f5f54", accent: "#c88f6a", border: "rgba(70,45,30,.18)", editor: "#fbe9da" }
};

const $ = (id) => document.getElementById(id);

const state = loadState();
let saveTimer;
let paletteIndex = 0;

init();

function init() {
  setupControls();
  bindEvents();
  ensureActiveDoc();
  sanitizeState();
  render();
}

function setupControls() {
  FONT_OPTIONS.forEach((f) => {
    const option = document.createElement("option");
    option.value = f.label;
    option.textContent = f.label;
    $("font-select").append(option);
  });

  Object.entries(THEMES).forEach(([key, theme]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = theme.name;
    $("theme-select").append(option);
  });

  $("font-select").value = state.font;
  $("theme-select").value = state.theme;
  $("custom-font-input").value = state.customFont || "";
}

function bindEvents() {
  $("new-tab-btn").addEventListener("click", () => createDoc());
  $("close-tab-btn").addEventListener("click", () => closeDoc(state.activeId));
  $("reopen-tab-btn").addEventListener("click", reopenDoc);
  $("pin-tab-btn").addEventListener("click", () => togglePin(state.activeId));

  $("font-select").addEventListener("change", (e) => {
    state.font = e.target.value;
    if (!state.customFont) applyAppearance();
    queueSave();
  });

  $("theme-select").addEventListener("change", (e) => {
    state.theme = e.target.value;
    applyAppearance();
    queueSave();
  });

  $("apply-font-btn").addEventListener("click", applyCustomFont);
  $("custom-font-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyCustomFont();
    }
  });

  $("doc-title").addEventListener("input", (e) => {
    const doc = activeDoc();
    if (!doc) return;
    doc.title = e.target.value;
    renderTabs();
    queueSave();
  });

  $("editor").addEventListener("input", (e) => {
    const doc = activeDoc();
    if (!doc) return;
    doc.content = e.target.value;
    updateWordCount();
    queueSave();
  });

  document.addEventListener("keydown", onKeydown);
  $("palette-input").addEventListener("input", renderPaletteResults);
  $("palette-input").addEventListener("keydown", onPaletteKeydown);
}

function applyCustomFont() {
  const value = $("custom-font-input").value.trim();
  state.customFont = value;
  applyAppearance();
  queueSave();
}

function onKeydown(e) {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key.toLowerCase() === "n") {
    e.preventDefault();
    createDoc();
  }
  if (mod && e.key.toLowerCase() === "w") {
    e.preventDefault();
    closeDoc(state.activeId);
  }
  if (mod && e.shiftKey && e.key.toLowerCase() === "t") {
    e.preventDefault();
    reopenDoc();
  }
  if (mod && e.key.toLowerCase() === "p") {
    e.preventDefault();
    openPalette();
  }
  if (mod && e.key >= "1" && e.key <= "9") {
    const index = Number(e.key) - 1;
    const ordered = sortedDocs();
    if (ordered[index]) {
      state.activeId = ordered[index].id;
      render();
      queueSave();
    }
  }
}

function openPalette() {
  const dialog = $("command-palette");
  renderPaletteResults();
  dialog.showModal();
  $("palette-input").value = "";
  $("palette-input").focus();
}

function onPaletteKeydown(e) {
  const results = getPaletteResults();
  if (!results.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    paletteIndex = (paletteIndex + 1) % results.length;
    renderPaletteResults();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    paletteIndex = (paletteIndex - 1 + results.length) % results.length;
    renderPaletteResults();
  } else if (e.key === "Enter") {
    e.preventDefault();
    choosePaletteDoc(results[paletteIndex].id);
  } else if (e.key === "Escape") {
    $("command-palette").close();
  }
}

function renderPaletteResults() {
  const ul = $("palette-results");
  const results = getPaletteResults();
  paletteIndex = Math.min(paletteIndex, Math.max(results.length - 1, 0));
  ul.innerHTML = "";
  results.forEach((doc, idx) => {
    const li = document.createElement("li");
    li.className = idx === paletteIndex ? "active" : "";
    li.textContent = doc.title || "Untitled";
    li.addEventListener("click", () => choosePaletteDoc(doc.id));
    ul.append(li);
  });
}

function getPaletteResults() {
  const q = $("palette-input").value.trim().toLowerCase();
  return sortedDocs().filter((doc) => (doc.title || "Untitled").toLowerCase().includes(q));
}

function choosePaletteDoc(id) {
  state.activeId = id;
  $("command-palette").close();
  render();
  queueSave();
}

function createDoc() {
  const doc = { id: crypto.randomUUID(), title: "Untitled", content: "", pinned: false };
  state.docs.push(doc);
  state.activeId = doc.id;
  render();
  queueSave();
  $("doc-title").focus();
}

function closeDoc(id) {
  if (!id || state.docs.length === 1) return;
  const idx = state.docs.findIndex((doc) => doc.id === id);
  if (idx < 0) return;
  const [removed] = state.docs.splice(idx, 1);
  state.closed.unshift(removed);
  state.closed = state.closed.slice(0, 10);
  state.activeId = state.docs[Math.max(0, idx - 1)]?.id || state.docs[0].id;
  render();
  queueSave();
}

function reopenDoc() {
  const doc = state.closed.shift();
  if (!doc) return;
  state.docs.push(doc);
  state.activeId = doc.id;
  render();
  queueSave();
}

function togglePin(id) {
  const doc = state.docs.find((d) => d.id === id);
  if (!doc) return;
  doc.pinned = !doc.pinned;
  renderTabs();
  queueSave();
}

function render() {
  applyAppearance();
  renderTabs();
  const doc = activeDoc();
  if (!doc) return;
  $("doc-title").value = doc.title;
  $("editor").value = doc.content;
  updateWordCount();
}

function renderTabs() {
  const strip = $("tab-strip");
  strip.innerHTML = "";
  sortedDocs().forEach((doc) => {
    const tab = document.createElement("button");
    tab.className = `tab ${doc.id === state.activeId ? "active" : ""}`;
    tab.innerHTML = `<span class="name">${escapeHtml(doc.title || "Untitled")}</span>${doc.pinned ? '<span class="pin-badge">keep</span>' : ""}`;
    tab.addEventListener("click", () => {
      state.activeId = doc.id;
      render();
      queueSave();
    });
    strip.append(tab);
  });
}

function applyAppearance() {
  const theme = THEMES[state.theme] || THEMES.cream;
  document.documentElement.style.setProperty("--bg", theme.bg);
  document.documentElement.style.setProperty("--panel", theme.panel);
  document.documentElement.style.setProperty("--text", theme.text);
  document.documentElement.style.setProperty("--muted", theme.muted);
  document.documentElement.style.setProperty("--accent", theme.accent);
  document.documentElement.style.setProperty("--border", theme.border);
  document.documentElement.style.setProperty("--editor-bg", theme.editor);

  const preset = FONT_OPTIONS.find((f) => f.label === state.font) || FONT_OPTIONS[0];
  const chosen = state.customFont?.trim() || preset.stack;
  document.documentElement.style.setProperty("--font", chosen);
}

function updateWordCount() {
  const text = $("editor").value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  $("word-count").textContent = `${words} ${words === 1 ? "word" : "words"}`;
}

function sortedDocs() {
  return [...state.docs].sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

function activeDoc() {
  return state.docs.find((doc) => doc.id === state.activeId);
}

function ensureActiveDoc() {
  if (!state.docs.length) {
    state.docs.push({
      id: crypto.randomUUID(),
      title: "Welcome",
      content: "Use custom font stack in the top bar (e.g. 'Avenir Next, Inter, sans-serif').",
      pinned: true
    });
  }
  if (!state.docs.some((doc) => doc.id === state.activeId)) {
    state.activeId = state.docs[0].id;
  }
}

function sanitizeState() {
  if (!THEMES[state.theme]) state.theme = "cream";
  if (!FONT_OPTIONS.some((f) => f.label === state.font)) state.font = FONT_OPTIONS[0].label;
  if (typeof state.customFont !== "string") state.customFont = "";
  if (!Array.isArray(state.closed)) state.closed = [];
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 220);
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.docs)) return parsed;
  } catch {
    // noop fallback
  }
  return {
    docs: [],
    closed: [],
    activeId: "",
    font: "Source Sans 3",
    customFont: "",
    theme: "cream"
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHtml(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

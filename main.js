import { detectMessages, deriveCalib, deriveSelCalib, scrollParent, findInput, setInput } from "./lib/dom.js";
import { SITE } from "./lib/site.js";
import { merge, estimateTokens, totalChars, buildParts, toMarkdownFile, SUMMARY_PROMPT, MODES } from "./lib/pack.js";
import * as store from "./lib/store.js";
import { createUI } from "./lib/ui.js";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const chatKey = () => SITE.keyOf(location.pathname);
const hhmm = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export async function start() {
  if (window.__pontStarted) return;
  window.__pontStarted = true;

  let settings = await store.getSettings();
  if (!settings.__init) settings = await store.setSettings({ __init: true, partSize: SITE.partSize });
  let key = chatKey();
  let msgs = ((await store.getChat(key)) || {}).msgs || [];
  let archives = [];
  let status = "", calibNote = "", busy = false, ui;
  const warned = new Set();

  const detect = () => {
    const d = detectMessages(document, settings.calib, SITE);
    calibNote = settings.calib && !d.usedCalib ? "Calibrage introuvable : détection automatique utilisée." : "";
    return d;
  };
  const partsOf = m => buildParts(m, { mode: settings.mode, partSize: settings.partSize, keepLast: settings.keepLast });
  const titleOf = m => { const f = m.find(x => x.r === "u"); return f ? f.t.replace(/\s+/g, " ").slice(0, 60) : "Discussion Claude"; };

  async function loadArchives() {
    const chats = await store.getChats();
    archives = Object.entries(chats).sort((a, b) => b[1].updated - a[1].updated)
      .map(([k, c]) => ({ key: k, title: c.title, updated: c.updated, count: c.msgs.length, tokens: estimateTokens(totalChars(c.msgs)) }));
  }

  function refresh() {
    const parts = partsOf(msgs);
    const first = msgs[0], last = msgs[msgs.length - 1];
    const preview = msgs.length
      ? `Détection : ${calibNote || (settings.calib ? "calibrée" : "automatique")}. Premier : « ${first.t.replace(/\s+/g, " ").slice(0, 40)} ». Dernier : « ${last.t.replace(/\s+/g, " ").slice(0, 40)} ».`
      : (calibNote || "Aucun message détecté. Si la page contient une discussion, utilise « Calibrer la détection ».");
    ui.update({
      count: msgs.length, nUser: msgs.filter(m => m.r === "u").length, nAI: msgs.filter(m => m.r === "a").length,
      tokens: estimateTokens(totalChars(msgs)), limit: settings.limitTokens, settings,
      parts: { n: parts.length, tokens: estimateTokens(parts.join("").length) },
      archives, status, busy, preview
    });
  }

  async function switchKey(k) {
    if (key === "nouveau" && msgs.length && k !== "nouveau") {
      const ex = await store.getChat(k);
      msgs = ex ? merge(ex.msgs, msgs) : msgs;
      await store.deleteChat("nouveau");
    } else msgs = ((await store.getChat(k)) || {}).msgs || [];
    key = k;
    await sleep(1200);
  }

  async function snapshot() {
    const k = chatKey();
    if (k !== key) await switchKey(k);
    const D = detect();
    if (D.length) {
      msgs = merge(msgs, D.map(({ r, t }) => ({ r, t })));
      await store.saveChat(key, msgs);
      const tokens = estimateTokens(totalChars(msgs));
      if (settings.limitTokens > 0 && tokens / settings.limitTokens >= 0.85 && !warned.has(key)) {
        warned.add(key);
        ui.toast(`Conversation à ${Math.round((tokens / settings.limitTokens) * 100)} % de la limite. Prépare le pont.`);
      }
    }
    refresh();
    return D;
  }

  const scrollTo0 = (el, top) => (el.scrollTo ? el.scrollTo({ top, behavior: "instant" }) : (el.scrollTop = top));

  async function captureAll() {
    if (busy) return;
    busy = true; status = "Capture en cours…"; refresh();
    try {
      let D = detect();
      if (!D.length) { status = "Aucun message détecté. Ouvre Réglages et calibre la détection."; return; }
      const sc = scrollParent(D[0].el, document);
      let last = -1, stable = 0;
      for (let i = 0; i < 80 && stable < 3; i++) {
        scrollTo0(sc, 0); await sleep(280);
        D = await snapshot();
        if (D.length === last && sc.scrollTop <= 2) stable++; else stable = 0;
        last = D.length;
        status = `Capture… ${msgs.length} messages`; refresh();
      }
      if (D.length < msgs.length) {
        for (let s = 0; s < 120 && sc.scrollTop + sc.clientHeight < sc.scrollHeight - 4; s++) {
          scrollTo0(sc, sc.scrollTop + sc.clientHeight * 0.8); await sleep(120); await snapshot();
        }
      }
      scrollTo0(sc, sc.scrollHeight);
      status = `✓ ${msgs.length} messages capturés à ${hhmm()}`;
    } finally { busy = false; refresh(); }
  }

  async function openBridge(m) {
    if (!m.length) { ui.toast("Rien à transférer : capture d'abord la discussion."); return; }
    await store.setBridge({ parts: partsOf(m), next: 0, ts: Date.now() });
    window.open(SITE.newChatUrl, "_blank");
  }

  function download(m, title) {
    const blob = new Blob([toMarkdownFile(title, m)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "claude-" + new Date().toISOString().slice(0, 10) + ".md";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---- Calibrage : un clic sur un de tes messages, puis un clic sur une réponse de l'IA
  function calibrate() {
    const picks = {};
    let hovered = null, step = "u";
    const ask = () => ui.toast(step === "u" ? "Étape 1/2 : clique sur un de TES messages. Échap pour annuler." : "Étape 2/2 : clique sur une réponse de l'IA.", 60000);
    const unhover = () => { if (hovered) { hovered.style.outline = hovered.__old || ""; hovered = null; } };
    const stop = () => { unhover(); document.removeEventListener("mousemove", move, true); document.removeEventListener("click", click, true); document.removeEventListener("keydown", key2, true); };
    const move = e => {
      const el = e.target; if (el === hovered || (el.closest && el.closest("#pont-host"))) return;
      unhover(); hovered = el; el.__old = el.style.outline; el.style.outline = "3px solid #FFC300";
    };
    const click = async e => {
      if (e.target.closest && e.target.closest("#pont-host")) return;
      e.preventDefault(); e.stopPropagation();
      picks[step] = e.target; unhover();
      if (step === "u") { step = "a"; ask(); return; }
      stop();
      const c = deriveSelCalib(picks.u, picks.a) || deriveCalib(picks.u, picks.a);
      if (!c) { ui.toast("Calibrage impossible : choisis un message de toi puis une réponse de l'IA dans la même discussion."); return; }
      settings = await store.setSettings({ calib: c });
      const D = await snapshot();
      ui.toast(D.length ? `Calibrage enregistré : ${D.length} messages détectés.` : "Calibrage enregistré, mais aucun message détecté.");
    };
    const key2 = e => { if (e.key === "Escape") { stop(); ui.toast("Calibrage annulé."); } };
    document.addEventListener("mousemove", move, true);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key2, true);
    ask();
  }

  ui = createUI({
    onOpen: async () => { await loadArchives(); refresh(); },
    capture: captureAll,
    bridge: () => openBridge(msgs),
    copy: async () => {
      if (!msgs.length) return ui.toast("Rien à copier : capture d'abord la discussion.");
      try { await navigator.clipboard.writeText(partsOf(msgs).join("\n\n")); ui.toast("Pont copié dans le presse-papiers."); } catch { ui.toast("Copie refusée par le navigateur."); }
    },
    download: () => (msgs.length ? download(msgs, titleOf(msgs)) : ui.toast("Rien à télécharger.")),
    summary: async () => {
      const inp = findInput(document, SITE);
      if (inp) { setInput(inp, SUMMARY_PROMPT); ui.toast("Prompt de résumé inséré. Envoie-le, puis lance le pont."); }
      else { try { await navigator.clipboard.writeText(SUMMARY_PROMPT); ui.toast("Champ introuvable : prompt copié."); } catch {} }
    },
    markLimit: async () => {
      const tokens = estimateTokens(totalChars(msgs));
      if (!tokens) return ui.toast("Capture d'abord la discussion pour mesurer sa taille.");
      settings = await store.setSettings({ limitTokens: tokens });
      refresh(); ui.toast(`Limite enregistrée : ≈ ${tokens.toLocaleString("fr-FR")} tokens. Alerte à 85 %.`);
    },
    calibrate,
    clearCalib: async () => { settings = await store.setSettings({ calib: null }); await snapshot(); },
    settings: async patch => { settings = await store.setSettings(patch); refresh(); },
    archBridge: async k => { const c = await store.getChat(k); if (c) openBridge(c.msgs); },
    archDl: async k => { const c = await store.getChat(k); if (c) download(c.msgs, c.title); },
    archDel: async k => { await store.deleteChat(k); await loadArchives(); refresh(); },
    wipe: async () => { await store.clearChats(); msgs = []; await loadArchives(); refresh(); ui.toast("Archives effacées."); }
  });

  // ---- Reprise du pont dans le nouveau chat
  async function resumeBridge() {
    const b = await store.getBridge();
    if (!b) return;
    if (Date.now() - b.ts > 15 * 60 * 1000) { await store.clearBridge(); return; }
    const isNew = !SITE.isChatPath(location.pathname) && detect().length === 0;
    const insert = async () => {
      const inp = findInput(document, SITE);
      if (!inp) { ui.toast("Champ de saisie introuvable."); return false; }
      setInput(inp, b.parts[b.next]); b.next++; await store.setBridge(b); showBanner(); return true;
    };
    function showBanner() {
      const n = b.parts.length;
      if (b.next >= n) ui.banner({ text: `Pont terminé : ${n}/${n} partie${n > 1 ? "s" : ""} insérée${n > 1 ? "s" : ""}. Envoie la dernière.`, action: "", onClose: close });
      else ui.banner({
        text: b.next === 0 ? `Pont prêt (${n} partie${n > 1 ? "s" : ""}).` : `Partie ${b.next}/${n} insérée. Envoie-la, puis insère la suite.`,
        action: `Insérer la partie ${b.next + 1}/${n}`, onAction: insert, onClose: close
      });
    }
    async function close() { await store.clearBridge(); ui.banner(null); }
    if (isNew && b.next === 0) {
      for (let i = 0; i < 40; i++) { if (findInput(document, SITE)) { await insert(); return; } await sleep(250); }
    }
    showBanner();
  }

  // ---- Capture continue en arrière-plan
  const run = debounce(() => snapshot().catch(console.error), 1500);
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true, characterData: true });
  setInterval(() => { if (chatKey() !== key) run(); }, 1000);

  await loadArchives();
  refresh();
  run();
  resumeBridge();
}

const SKIP = new Set(["script", "style", "svg", "button", "textarea", "input", "select"]);
const NOISE = /^(copy|copier|download|télécharger|run|exécuter|edit|modifier|retry|réessayer)$/i;
const esc = c => c.replace(/([^\w-])/g, "\\$1");

// ---------- DOM -> Markdown
function inner(node) { return [...node.childNodes].map(md).join(""); }

function fence(el, lang) {
  return "\n```" + (/^[\w+#.-]{1,15}$/.test(lang || "") ? lang : "") + "\n" + el.textContent.replace(/\n$/, "") + "\n```\n";
}

function md(node) {
  if (node.nodeType === 3) return node.nodeValue.replace(/\s+/g, " ");
  if (node.nodeType !== 1) return "";
  const tag = node.tagName.toLowerCase();
  if (SKIP.has(tag)) return "";
  if (tag === "pre") {
    const code = node.querySelector("code");
    const lm = code && (code.className.match(/language-([\w+#.-]+)/) || [])[1];
    return fence(node, lm);
  }
  switch (tag) {
    case "br": return "\n";
    case "p": return "\n" + inner(node).trim() + "\n";
    case "h1": case "h2": case "h3": case "h4": case "h5": case "h6":
      return "\n" + "#".repeat(+tag[1]) + " " + inner(node).trim() + "\n";
    case "ul": case "ol": {
      const items = [...node.children].filter(c => c.tagName === "LI");
      return "\n" + items.map((li, i) => (tag === "ol" ? `${i + 1}. ` : "- ") + inner(li).trim().replace(/\n/g, "\n  ")).join("\n") + "\n";
    }
    case "li": return "\n- " + inner(node).trim();
    case "code": return "`" + node.textContent + "`";
    case "strong": case "b": return "**" + inner(node) + "**";
    case "em": case "i": return "*" + inner(node) + "*";
    case "blockquote": return "\n> " + inner(node).trim().replace(/\n/g, "\n> ") + "\n";
    case "td": case "th": return inner(node).trim() + " | ";
    case "tr": return "\n| " + inner(node).trim();
    case "div": case "section": case "article": case "table": case "tbody": case "thead":
      return "\n" + inner(node) + "\n";
    default: return inner(node);
  }
}

function clean(s) {
  const lines = s.split("\n").map(l => l.replace(/[ \t]+$/, ""));
  const out = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith("```")) { inFence = !inFence; out.push(line.trimStart()); continue; }
    if (inFence) { out.push(line); continue; }
    if (NOISE.test(line.trim())) continue;
    // étiquette de langage affichée au-dessus d'un bloc de code (« python »)
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const next = (lines[j] || "").trimStart();
    if (/^[\w+#.-]{1,15}$/.test(line.trim()) && next.startsWith("```") && next.slice(3).toLowerCase() === line.trim().toLowerCase()) continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function toMd(node) { return clean(md(node)); }

// ---------- Détection des messages
export function sig(el) {
  return el.tagName.toLowerCase() + "." + [...el.classList].sort().join(".");
}
const hasText = el => el.textContent.trim().length > 0;

function selRows(doc, c) {
  let els;
  try { els = [...doc.querySelectorAll(`${c.userSel}, ${c.aiSel}`)]; } catch { return null; }
  els = els.filter(e => !els.some(o => o !== e && o.contains(e)));
  return els.map(el => {
    let isAi = false, isUser = false;
    try { isAi = el.matches(c.aiSel); isUser = el.matches(c.userSel); } catch {}
    return { el, role: isAi && !isUser ? "a" : "u" };
  });
}

function calibRows(list, calib) {
  return [...list.children].filter(hasText).map((el, i) => {
    const s = sig(el);
    let role;
    if (s === calib.sigU && s !== calib.sigA) role = "u";
    else if (s === calib.sigA && s !== calib.sigU) role = "a";
    else role = i % 2 === 0 ? "u" : "a";
    return { el, role };
  });
}

export function detectMessages(doc, calib, site) {
  let rows = null, mode = "auto";
  if (calib && calib.userSel && calib.aiSel) {
    rows = selRows(doc, calib);
    if (rows && rows.length) mode = "calib"; else rows = null;
  }
  if (!rows && calib && calib.listPath) {
    let list = null;
    try { list = doc.querySelector(calib.listPath); } catch {}
    if (list) { rows = calibRows(list, calib); mode = "calib"; }
  }
  if (!rows || !rows.length) { rows = selRows(doc, site); mode = "auto"; }
  const out = [];
  for (const r of rows || []) {
    const t = toMd(r.el);
    if (!t) continue;
    const prev = out[out.length - 1];
    if (prev && prev.r === "a" && r.role === "a") prev.t += "\n\n" + t;   // réponse en plusieurs blocs
    else out.push({ r: r.role, t, el: r.el });
  }
  out.usedCalib = mode === "calib";
  return out;
}

// ---------- Calibrage manuel : un clic sur un de tes messages, puis sur une réponse
export function cssPath(el) {
  const doc = el.ownerDocument;
  const parts = [];
  let n = el;
  for (let i = 0; n && n.nodeType === 1 && n !== doc.body && i < 6; i++) {
    let s = n.tagName.toLowerCase();
    const cls = [...n.classList].filter(c => /^[a-zA-Z_-][\w-]*$/.test(c)).slice(0, 3);
    if (cls.length) s += "." + cls.join(".");
    else if (n.parentElement) s += `:nth-child(${[...n.parentElement.children].indexOf(n) + 1})`;
    parts.unshift(s);
    const sel = parts.join(" > ");
    try { if (doc.querySelectorAll(sel).length === 1) return sel; } catch {}
    n = n.parentElement;
  }
  return parts.join(" > ");
}

function selectorOf(n) {
  const tid = n.getAttribute && n.getAttribute("data-testid");
  if (tid) return `${n.tagName.toLowerCase()}[data-testid="${tid}"]`;
  const cls = [...n.classList].filter(c => /^[a-zA-Z_-]/.test(c)).slice(0, 3);
  return cls.length ? n.tagName.toLowerCase() + cls.map(c => "." + esc(c)).join("") : null;
}

// Cherche le plus grand bloc qui contient le message cliqué mais pas l'autre
function pickSel(el, other) {
  const doc = el.ownerDocument;
  const chain = [];
  for (let n = el; n && n !== doc.body; n = n.parentElement) {
    if (n.contains(other)) break;
    chain.push(n);
  }
  for (const n of chain.reverse()) {
    const s = selectorOf(n);
    if (!s) continue;
    let m;
    try { m = [...doc.querySelectorAll(s)]; } catch { continue; }
    if (m.includes(n) && !m.some(x => x === other || x.contains(other) || other.contains(x))) return s;
  }
  return null;
}

export function deriveSelCalib(userEl, aiEl) {
  const userSel = pickSel(userEl, aiEl), aiSel = pickSel(aiEl, userEl);
  return userSel && aiSel ? { userSel, aiSel } : null;
}

// Variante pour les pages où chaque message est un enfant direct d'une même liste
export function deriveCalib(userEl, aiEl) {
  const ancU = [];
  for (let n = userEl; n; n = n.parentElement) ancU.push(n);
  for (let n = aiEl; n; n = n.parentElement) {
    const p = n.parentElement;
    if (!p) break;
    const hit = ancU.find(m => m !== n && m.parentElement === p);
    if (hit) return { listPath: cssPath(p), sigU: sig(hit), sigA: sig(n) };
  }
  return null;
}

// ---------- Défilement et champ de saisie
export function scrollParent(el, doc) {
  for (let n = el && el.parentElement; n && n !== doc.body; n = n.parentElement) {
    const oy = doc.defaultView.getComputedStyle(n).overflowY;
    if ((oy === "auto" || oy === "scroll") && n.scrollHeight > n.clientHeight + 10) return n;
  }
  return doc.scrollingElement || doc.documentElement;
}

const visible = e => e.offsetParent !== null || e.getClientRects().length > 0;

export function findInput(doc, site) {
  for (const s of (site && site.inputSel) || []) {
    const e = [...doc.querySelectorAll(s)].find(visible);
    if (e) return e;
  }
  const c = [...doc.querySelectorAll("textarea, [contenteditable='true'], [role='textbox']")].filter(visible);
  c.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
  return c[0] || null;
}

export function setInput(el, text) {
  const d = el.ownerDocument, w = d.defaultView;
  el.focus();
  if (el.tagName === "TEXTAREA") {
    const setter = Object.getOwnPropertyDescriptor(w.HTMLTextAreaElement.prototype, "value").set;
    setter.call(el, text);
    el.dispatchEvent(new w.Event("input", { bubbles: true }));
    return;
  }
  // Champ riche (ProseMirror) : un « collage » simulé garde les retours à la ligne
  try { d.execCommand("selectAll", false); } catch {}
  try {
    const dt = new w.DataTransfer();
    dt.setData("text/plain", text);
    el.dispatchEvent(new w.ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  } catch {}
  if (!el.textContent.trim()) {
    try { d.execCommand("selectAll", false); d.execCommand("insertText", false, text); } catch {}
  }
}

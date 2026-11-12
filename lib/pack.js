export const estimateTokens = chars => Math.ceil(chars / 3.6);
export const totalChars = msgs => msgs.reduce((a, m) => a + m.t.length, 0);

const key = m => m.r + "|" + m.t.slice(0, 160);

// Fusionne un instantané du DOM (D) dans l'historique sauvegardé (S)
export function merge(S, D) {
  if (!D.length) return S;
  if (!S.length) return D;
  const dk = D.map(key);
  const i = S.findIndex(m => key(m) === dk[0]);
  if (i >= 0) return [...S.slice(0, i), ...D, ...S.slice(i + D.length)];
  const j = S.findIndex(m => key(m) === dk[dk.length - 1]);
  if (j >= 0) return [...S.slice(0, Math.max(0, j - (D.length - 1))), ...D, ...S.slice(j + 1)];
  if (D.length >= S.length) return D;
  const seen = new Set(S.map(key));
  return [...S, ...D.filter(m => !seen.has(key(m)))];
}

// Réduit une ancienne réponse de l'IA : code remplacé par une mention, texte coupé
export function shrink(text, max = 500) {
  let out = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `[code ${lang || ""} omis : ${code.trim().split("\n").length} lignes]`);
  if (out.length > max) out = out.slice(0, max).replace(/\s+\S*$/, "") + " […]";
  return out;
}

export const MODES = { brief: "Brief", compact: "Compact", full: "Complet" };

function blocks(msgs, mode, keepLast) {
  const ai = msgs.map((m, i) => (m.r === "a" ? i : -1)).filter(i => i >= 0);
  const keep = new Set(ai.slice(-keepLast));
  const out = [];
  msgs.forEach((m, i) => {
    if (mode === "brief") {
      if (m.r === "u") out.push(`### Moi\n${m.t}`);
      else if (i === ai[ai.length - 1]) out.push(`### Dernière réponse de l'IA\n${m.t}`);
      return;
    }
    if (m.r === "u") out.push(`### Moi\n${m.t}`);
    else if (mode === "compact" && !keep.has(i)) out.push(`### IA (version réduite)\n${shrink(m.t)}`);
    else out.push(`### IA\n${m.t}`);
  });
  return out;
}

function splitBig(block, max) {
  if (block.length <= max) return [block];
  const parts = [];
  let cur = "";
  for (const para of block.split("\n\n")) {
    if ((cur + "\n\n" + para).length > max && cur) { parts.push(cur); cur = para; } else cur = cur ? cur + "\n\n" + para : para;
    while (cur.length > max) { parts.push(cur.slice(0, max)); cur = cur.slice(max); }
  }
  if (cur) parts.push(cur);
  return parts;
}

function header(i, n, mode) {
  const label = MODES[mode].toLowerCase();
  if (n === 1) return `Je reprends une conversation précédente qui a atteint sa limite de longueur. Voici son historique (version ${label}). Lis tout, puis réponds seulement « Contexte chargé » suivi d'un résumé de l'état en 5 lignes. Je te donnerai ensuite la suite.`;
  if (i === 0) return `Je reprends une conversation précédente qui a atteint sa limite de longueur. L'historique (version ${label}) arrive en ${n} parties. Pour chaque partie, réponds seulement « Partie i/${n} reçue ». Après la dernière, résume l'état en 5 lignes.\n\nPartie 1/${n}.`;
  if (i === n - 1) return `Dernière partie (${n}/${n}). Après lecture, réponds « Contexte chargé » et résume l'état en 5 lignes.`;
  return `Partie ${i + 1}/${n}. Réponds seulement « Partie ${i + 1}/${n} reçue ».`;
}

export function buildParts(msgs, { mode = "compact", partSize = 28000, keepLast = 3 } = {}) {
  const room = Math.max(2000, partSize - 700);
  const chunks = [];
  let cur = "";
  for (const b of blocks(msgs, mode, keepLast).flatMap(b => splitBig(b, room))) {
    if (cur && (cur + "\n\n" + b).length > room) { chunks.push(cur); cur = b; } else cur = cur ? cur + "\n\n" + b : b;
  }
  if (cur) chunks.push(cur);
  const n = chunks.length || 1;
  return (chunks.length ? chunks : [""]).map((c, i) => `${header(i, n, mode)}\n\n=== DÉBUT DE L'HISTORIQUE (${i + 1}/${n}) ===\n${c}\n=== FIN (${i + 1}/${n}) ===`);
}

export function toMarkdownFile(title, msgs) {
  return `# ${title}\n\n` + msgs.map(m => `## ${m.r === "u" ? "Moi" : "IA"}\n\n${m.t}`).join("\n\n---\n\n") + "\n";
}

export const SUMMARY_PROMPT = "Prépare un document de passage pour reprendre ce travail dans une nouvelle conversation. Structure : 1) objectif, 2) décisions prises, 3) état actuel (garde le code final complet), 4) problèmes ouverts, 5) prochaines étapes. Sois dense, sans introduction ni politesse.";

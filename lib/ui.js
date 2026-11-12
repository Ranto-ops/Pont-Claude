const CSS = `
:host{all:initial}
*{box-sizing:border-box}
.root{position:fixed;right:20px;bottom:20px;z-index:2147483647;font:13px/1.4 system-ui,"Segoe UI",Roboto,sans-serif;color:#17191E}
button,input,summary{font-family:inherit}
button:focus-visible,summary:focus-visible,input:focus-visible{outline:3px solid #1B5FD6;outline-offset:2px}
.sign{width:60px;height:60px;border:0;border-radius:50%;padding:0;background:#fff;cursor:pointer;display:block;box-shadow:0 3px 0 #2B2F36,0 8px 18px rgba(0,0,0,.28)}
.sign svg{display:block}
.panel{position:absolute;right:0;bottom:74px;width:344px;max-height:min(78vh,720px);overflow:auto;background:#ECEAE5;border:2px solid #2B2F36;border-radius:6px;box-shadow:6px 6px 0 #2B2F36}
.panel[hidden],.toast[hidden],.banner[hidden]{display:none}
.head{display:flex;align-items:center;gap:10px;background:#2B2F36;color:#fff;padding:10px 12px;position:sticky;top:0;z-index:1}
.head h2{margin:0;font:800 17px system-ui;flex:1}
.x{border:0;background:none;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0 4px}
.stripe{height:8px;background:repeating-linear-gradient(135deg,#D97757 0 10px,#2B2F36 10px 20px)}
.body{padding:12px 14px 14px}
h3{margin:16px 0 4px;font:800 13px system-ui}
.load{display:flex;gap:12px;align-items:center}
.load b{display:block;font-size:15px}
.muted{color:#5A5F69;font-size:12px}
.btn{display:block;width:100%;margin-top:8px;padding:9px 12px;border:2px solid #2B2F36;border-bottom-width:4px;border-radius:4px;background:#fff;color:#17191E;font-weight:700;font-size:13px;cursor:pointer;text-align:center}
.btn.primary{background:#D97757}
.btn:active:not(:disabled){transform:translateY(2px);border-bottom-width:2px}
.btn:disabled{opacity:.5;cursor:wait}
.two{display:flex;gap:8px}.two .btn{flex:1}
.status{margin:8px 0 0;min-height:18px;color:#17191E;font-weight:600}
.seg{display:flex;border:2px solid #2B2F36;border-radius:4px;overflow:hidden;background:#fff}
.seg button{flex:1;border:0;padding:7px 4px;background:none;font-weight:700;cursor:pointer;color:#17191E}
.seg button+button{border-left:2px solid #2B2F36}
.seg button[aria-pressed="true"]{background:#2B2F36;color:#fff}
details{margin-top:14px;border-top:2px solid #2B2F36;padding-top:8px}
summary{cursor:pointer;font-weight:800}
.field{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0}
.field input[type=number]{width:90px;padding:5px 6px;border:2px solid #2B2F36;border-radius:4px;background:#fff}
.field input[type=checkbox]{width:18px;height:18px}
ul{list-style:none;margin:8px 0 0;padding:0}
li.arch{padding:8px 0;border-bottom:1px solid #CFCBC2}
li.arch b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mini{display:flex;gap:6px;margin-top:4px}
.mini button,.link{border:0;background:none;color:#1B5FD6;font-weight:700;text-decoration:underline;cursor:pointer;padding:0;font-size:12px}
.toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);max-width:420px;background:#2B2F36;color:#fff;padding:10px 14px;border-radius:4px;border-bottom:4px solid #D97757;font-weight:600}
.banner{position:fixed;top:16px;right:20px;width:330px;background:#ECEAE5;border:2px solid #2B2F36;border-radius:6px;box-shadow:5px 5px 0 #2B2F36}
.banner .stripe{height:6px}.banner .in{padding:10px 12px}
.banner p{margin:0 0 4px;font-weight:700}
`;

const fmtK = n => (n < 1000 ? String(n) : (n / 1000).toFixed(n < 10000 ? 1 : 0) + "K");
const nf = n => n.toLocaleString("fr-FR");

function ring(ratio, color, label, sub, size) {
  const r = 24, c = 2 * Math.PI * r, len = Math.max(0, Math.min(1, ratio)) * c;
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
  <circle cx="32" cy="32" r="30" fill="#fff"/>
  <circle cx="32" cy="32" r="${r}" fill="none" stroke="#D9D6CF" stroke-width="6"/>
  <circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="${len.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 32 32)"/>
  <text x="32" y="${sub ? 33 : 37}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${label.length > 3 ? 13 : 15}" fill="#17191E">${label}</text>
  ${sub ? `<text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#5A5F69">${sub}</text>` : ""}</svg>`;
}

const LOGO = `<svg viewBox="0 0 40 24" width="36" height="22" aria-hidden="true" fill="none" stroke="#D97757" stroke-width="2.5" stroke-linecap="round"><path d="M1 21H39"/><path d="M9 21V5M31 21V5"/><path d="M9 5Q20 21 31 5"/><path d="M1 15L9 5M31 5L39 15"/><path d="M15 15V21M20 17V21M25 15V21" stroke-width="1.5"/></svg>`;

export function createUI(h) {
  const host = document.createElement("div");
  host.id = "pont-host";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${CSS}</style>
<div class="root">
  <button class="sign" id="sign" type="button" aria-label="Ouvrir Pont (Alt+B)" title="Pont (Alt+B)"></button>
  <section class="panel" id="panel" hidden aria-label="Pont">
    <div class="head">${LOGO}<h2>Pont</h2><button class="x" id="close" type="button" aria-label="Fermer">×</button></div>
    <div class="stripe"></div>
    <div class="body">
      <div class="load"><div id="big"></div><div><b id="cnt"></b><span class="muted" id="split"></span><div class="muted" id="lim"></div></div></div>
      <button class="btn primary" id="capture" type="button">Capturer toute la discussion</button>
      <p class="status" id="status" aria-live="polite"></p>
      <h3>Passer à un nouveau chat</h3>
      <div class="seg" id="modes">
        <button type="button" data-m="brief" aria-pressed="false">Brief</button>
        <button type="button" data-m="compact" aria-pressed="false">Compact</button>
        <button type="button" data-m="full" aria-pressed="false">Complet</button>
      </div>
      <p class="muted" id="modeInfo"></p>
      <button class="btn primary" id="bridge" type="button">Ouvrir un nouveau chat avec le pont</button>
      <div class="two"><button class="btn" id="copy" type="button">Copier</button><button class="btn" id="dl" type="button">Télécharger .md</button></div>
      <h3>Avant d'atteindre la limite</h3>
      <button class="btn" id="summary" type="button">Insérer le prompt de résumé</button>
      <button class="btn" id="mark" type="button">J'ai atteint la limite ici</button>
      <details id="archD"><summary id="archS">Archives</summary><ul id="arch"></ul><button class="link" id="wipe" type="button" style="margin-top:8px">Tout effacer</button></details>
      <details><summary>Réglages</summary>
        <label class="field">Taille d'une partie (caractères)<input type="number" id="partSize" min="4000" step="2000"></label>
        <label class="field">Réponses IA gardées en entier (Compact)<input type="number" id="keepLast" min="0" max="20"></label>
        <p class="muted" id="detect"></p>
        <button class="btn" id="calib" type="button">Calibrer la détection</button>
        <button class="link" id="uncalib" type="button" style="margin-top:8px">Effacer le calibrage</button>
      </details>
    </div>
  </section>
  <div class="toast" id="toast" hidden role="status"></div>
  <aside class="banner" id="banner" hidden><div class="stripe"></div><div class="in"><p id="bText"></p><div class="two"><button class="btn primary" id="bGo" type="button"></button><button class="btn" id="bX" type="button">Terminer</button></div></div></aside>
</div>`;
  document.documentElement.appendChild(host);
  const $ = s => root.querySelector(s);
  let toastTimer;

  const toggle = open => {
    const p = $("#panel");
    p.hidden = open === undefined ? !p.hidden : !open;
    if (!p.hidden && h.onOpen) h.onOpen();
  };
  $("#sign").onclick = () => toggle();
  $("#close").onclick = () => toggle(false);
  document.addEventListener("keydown", e => { if (e.altKey && e.key.toLowerCase() === "b") { e.preventDefault(); toggle(); } });

  $("#capture").onclick = () => h.capture();
  $("#bridge").onclick = () => h.bridge();
  $("#copy").onclick = () => h.copy();
  $("#dl").onclick = () => h.download();
  $("#summary").onclick = () => h.summary();
  $("#mark").onclick = () => h.markLimit();
  $("#calib").onclick = () => h.calibrate();
  $("#uncalib").onclick = () => h.clearCalib();
  $("#wipe").onclick = () => h.wipe();
  root.querySelectorAll("#modes button").forEach(b => b.onclick = () => h.settings({ mode: b.dataset.m }));
  $("#partSize").onchange = e => h.settings({ partSize: Math.max(4000, +e.target.value || 60000) });
  $("#keepLast").onchange = e => h.settings({ keepLast: Math.max(0, +e.target.value || 0) });

  const MODE_TXT = { brief: "Tes prompts + la dernière réponse. Le plus léger.", compact: "Tes prompts + anciennes réponses réduites (code omis).", full: "Tout l'historique, mot pour mot." };

  return {
    update(s) {
      const ratio = s.limit > 0 ? s.tokens / s.limit : 1;
      const color = s.limit <= 0 ? "#9AA0AA" : ratio < 0.6 ? "#3B6EA5" : ratio < 0.85 ? "#E8A200" : "#D62828";
      $("#sign").innerHTML = ring(ratio, color, fmtK(s.tokens), "tokens", 60);
      $("#big").innerHTML = ring(ratio, color, fmtK(s.tokens), "tokens", 74);
      $("#cnt").textContent = `${s.count} message${s.count > 1 ? "s" : ""}`;
      $("#split").textContent = ` (${s.nUser} toi, ${s.nAI} IA)`;
      $("#lim").textContent = s.limit > 0 ? `Limite notée : ≈ ${nf(s.limit)} tokens (${Math.round(ratio * 100)} %)` : "Limite inconnue. Note-la quand tu l'atteins.";
      root.querySelectorAll("#modes button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === s.settings.mode)));
      $("#modeInfo").textContent = `${MODE_TXT[s.settings.mode]} ${s.parts.n} partie${s.parts.n > 1 ? "s" : ""}, ≈ ${nf(s.parts.tokens)} tokens à coller.`;
      $("#status").textContent = s.status || "";
      $("#capture").disabled = s.busy;
      for (const [id, v] of [["partSize", s.settings.partSize], ["keepLast", s.settings.keepLast]]) if (root.activeElement !== $("#" + id)) $("#" + id).value = v;
      $("#detect").textContent = s.preview;
      $("#uncalib").hidden = !s.settings.calib;
      $("#archS").textContent = `Archives (${s.archives.length})`;
      $("#arch").replaceChildren(...s.archives.map(a => {
        const li = document.createElement("li"); li.className = "arch";
        const b = document.createElement("b"); b.textContent = a.title;
        const m = document.createElement("span"); m.className = "muted";
        m.textContent = `${a.count} msgs · ≈ ${nf(a.tokens)} tokens · ${new Date(a.updated).toLocaleDateString("fr-FR")}`;
        const row = document.createElement("div"); row.className = "mini";
        for (const [label, fn] of [["Pont", h.archBridge], [".md", h.archDl], ["Suppr.", h.archDel]]) {
          const x = document.createElement("button"); x.type = "button"; x.textContent = label; x.onclick = () => fn(a.key); row.append(x);
        }
        li.append(b, m, row);
        return li;
      }));
    },
    toast(msg, ms = 4500) {
      const t = $("#toast"); t.textContent = msg; t.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms);
    },
    banner(opts) {
      const b = $("#banner");
      if (!opts) { b.hidden = true; return; }
      $("#bText").textContent = opts.text;
      $("#bGo").textContent = opts.action; $("#bGo").hidden = !opts.action;
      $("#bGo").onclick = opts.onAction; $("#bX").onclick = opts.onClose;
      b.hidden = false;
    },
    open: () => toggle(true)
  };
}

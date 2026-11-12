const ls = chrome.storage.local;
const MAX_CHATS = 30;

export const DEFAULTS = { mode: "compact", partSize: 60000, keepLast: 3, limitTokens: 0, calib: null };

export async function getSettings() {
  const { settings } = await ls.get("settings");
  return { ...DEFAULTS, ...(settings || {}) };
}
export async function setSettings(patch) {
  const s = { ...(await getSettings()), ...patch };
  await ls.set({ settings: s });
  return s;
}

export async function getChats() { return (await ls.get("chats")).chats || {}; }
export async function getChat(key) { return (await getChats())[key] || null; }

export async function saveChat(key, msgs) {
  const chats = await getChats();
  const first = msgs.find(m => m.r === "u");
  chats[key] = { msgs, updated: Date.now(), title: first ? first.t.replace(/\s+/g, " ").slice(0, 60) : "Sans titre" };
  const keys = Object.keys(chats).sort((a, b) => chats[b].updated - chats[a].updated);
  keys.slice(MAX_CHATS).forEach(k => delete chats[k]);
  await ls.set({ chats });
}
export async function deleteChat(key) { const c = await getChats(); delete c[key]; await ls.set({ chats: c }); }
export async function clearChats() { await ls.set({ chats: {} }); }

export async function getBridge() { return (await ls.get("bridge")).bridge || null; }
export async function setBridge(b) { await ls.set({ bridge: b }); }
export async function clearBridge() { await ls.remove("bridge"); }

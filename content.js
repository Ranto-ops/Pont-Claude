// Chargeur : les modules ES sont importés depuis l'extension
(async () => {
  try {
    const m = await import(chrome.runtime.getURL("main.js"));
    m.start();
  } catch (e) {
    console.error("[Pont] démarrage impossible", e);
  }
})();

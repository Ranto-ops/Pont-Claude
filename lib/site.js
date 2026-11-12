// Réglages propres au site. Si Claude change son interface, ils sont à ajuster ici
// (ou utilise « Calibrer la détection » dans le panneau).
export const SITE = {
  name: "Claude",
  newChatUrl: "https://claude.ai/new",
  keyOf: p => { const m = p.match(/\/chat\/([\w-]+)/); return m ? m[1] : "nouveau"; },
  isChatPath: p => /\/chat\//.test(p),
  userSel: '[data-testid="user-message"]',
  aiSel: '[class*="font-claude-response"], [class*="font-claude-message"]',
  inputSel: ['[data-testid="chat-input"]', 'div.ProseMirror[contenteditable="true"]', '[contenteditable="true"]'],
  partSize: 60000
};

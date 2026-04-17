import { Picker } from "./picker";
import { Inspector } from "./inspector";

const picker = new Picker();
const inspector = new Inspector(picker);

function onToggle(): void {
  // First ⌘⇧E or icon click: open panel.
  // Subsequent ⌘⇧E while panel is open: re-pick (arm picker, keep panel open).
  if (!inspector.isOpen()) {
    inspector.open(document.body);
    return;
  }
  inspector.rePick();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "toggle-picker") {
    onToggle();
    sendResponse({ ok: true });
  }
  return false;
});

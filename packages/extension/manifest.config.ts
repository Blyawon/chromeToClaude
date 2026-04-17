import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "chromeToClaude — click-to-prompt",
  description: "Pick any DOM element, edit its styles, and send a targeted prompt to Claude.",
  version: "0.1.0",
  action: {
    default_title: "Toggle element picker",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  options_page: "src/options/options.html",
  permissions: ["activeTab", "scripting", "storage", "tabs"],
  host_permissions: ["http://127.0.0.1:47823/*"],
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/framework-main.ts"],
      run_at: "document_start",
      all_frames: false,
      world: "MAIN",
    },
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
      all_frames: false,
    },
  ],
  commands: {
    "toggle-picker": {
      suggested_key: { default: "Ctrl+Shift+E", mac: "Command+Shift+E" },
      description: "Toggle the element picker overlay",
    },
  },
});

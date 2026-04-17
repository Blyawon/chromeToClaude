import { DAEMON_BASE_URL, TOKEN_STORAGE_KEY } from "@chrome-to-claude/shared";

const TOKEN_KEY = TOKEN_STORAGE_KEY;

const tokenInput = document.getElementById("token") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const pairBtn = document.getElementById("pair") as HTMLButtonElement;
const rotateBtn = document.getElementById("rotate") as HTMLButtonElement;
const pingBtn = document.getElementById("ping") as HTMLButtonElement;
const copyBtn = document.getElementById("copy") as HTMLButtonElement;

function setStatus(msg: string, kind: "" | "ok" | "err" = ""): void {
  statusEl.textContent = msg;
  statusEl.className = "status" + (kind ? " " + kind : "");
}

async function loadToken(): Promise<void> {
  const obj = await chrome.storage.local.get(TOKEN_KEY);
  tokenInput.value = typeof obj[TOKEN_KEY] === "string" ? obj[TOKEN_KEY] : "";
}

async function pair(rotate = false): Promise<void> {
  setStatus("contacting daemon…");
  try {
    const path = rotate ? "/pair/rotate" : "/pair";
    const res = await fetch(`${DAEMON_BASE_URL}${path}`, { method: "POST" });
    if (!res.ok) {
      setStatus(`daemon returned ${res.status}`, "err");
      return;
    }
    const body = (await res.json()) as { token: string };
    await chrome.storage.local.set({ [TOKEN_KEY]: body.token });
    tokenInput.value = body.token;
    setStatus(rotate ? "token rotated" : "paired", "ok");
  } catch (err) {
    setStatus(
      `daemon offline — run \`chrome-to-claude start\` (${String(err instanceof Error ? err.message : err)})`,
      "err",
    );
  }
}

async function ping(): Promise<void> {
  setStatus("pinging…");
  try {
    const res = await fetch(`${DAEMON_BASE_URL}/health`);
    if (!res.ok) {
      setStatus(`daemon returned ${res.status}`, "err");
      return;
    }
    const body = (await res.json()) as { version: string; queueSize: number };
    setStatus(`daemon v${body.version}, queue: ${body.queueSize}`, "ok");
  } catch (err) {
    setStatus(`daemon offline (${String(err instanceof Error ? err.message : err)})`, "err");
  }
}

pairBtn.addEventListener("click", () => void pair(false));
rotateBtn.addEventListener("click", () => void pair(true));
pingBtn.addEventListener("click", () => void ping());
copyBtn.addEventListener("click", async () => {
  await navigator.clipboard.writeText(tokenInput.value);
  setStatus("copied", "ok");
});

void loadToken();

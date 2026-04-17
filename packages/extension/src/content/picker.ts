type PickCallback = (el: HTMLElement) => void;

export class Picker {
  private active = false;
  private highlight: HTMLDivElement | null = null;
  private hostEl: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private onPick: PickCallback | null = null;
  private onCancel: (() => void) | null = null;
  private lastHovered: HTMLElement | null = null;

  private onMove = (e: MouseEvent) => this.handleMove(e);
  private onClick = (e: MouseEvent) => this.handleClick(e);
  private onKey = (e: KeyboardEvent) => this.handleKey(e);

  isActive(): boolean {
    return this.active;
  }

  start(onPick: PickCallback): void {
    if (this.active) return;
    this.active = true;
    this.onPick = onPick;
    this.mountHighlight();
    document.addEventListener("mousemove", this.onMove, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("keydown", this.onKey, true);
    document.documentElement.style.cursor = "crosshair";
  }

  // Same as start(), but the caller is expected to manage its own open UI.
  // Escape cancels without invoking the callback.
  startReplace(onPick: PickCallback, onCancel?: () => void): void {
    this.onCancel = onCancel ?? null;
    this.start(onPick);
  }

  stop(opts: { silent?: boolean } = {}): void {
    if (!this.active) return;
    this.active = false;
    const cancel = this.onCancel;
    this.onPick = null;
    this.onCancel = null;
    document.removeEventListener("mousemove", this.onMove, true);
    document.removeEventListener("click", this.onClick, true);
    document.removeEventListener("keydown", this.onKey, true);
    document.documentElement.style.cursor = "";
    this.unmountHighlight();
    this.lastHovered = null;
    if (!opts.silent) cancel?.();
  }

  private mountHighlight(): void {
    const host = document.createElement("div");
    host.style.all = "initial";
    host.style.position = "fixed";
    host.style.pointerEvents = "none";
    host.style.zIndex = "2147483646";
    host.style.top = "0";
    host.style.left = "0";
    host.style.width = "0";
    host.style.height = "0";
    const shadow = host.attachShadow({ mode: "closed" });
    const box = document.createElement("div");
    box.style.position = "fixed";
    box.style.pointerEvents = "none";
    box.style.border = "2px solid #5b8cff";
    box.style.background = "rgba(91, 140, 255, 0.12)";
    box.style.borderRadius = "2px";
    box.style.transition = "top 60ms, left 60ms, width 60ms, height 60ms";
    box.style.display = "none";
    shadow.appendChild(box);
    document.documentElement.appendChild(host);
    this.hostEl = host;
    this.shadow = shadow;
    this.highlight = box;
  }

  private unmountHighlight(): void {
    this.hostEl?.remove();
    this.hostEl = null;
    this.shadow = null;
    this.highlight = null;
  }

  private targetFromEvent(e: MouseEvent): HTMLElement | null {
    const path = e.composedPath();
    for (const node of path) {
      if (node instanceof HTMLElement && node !== this.hostEl) {
        return node;
      }
    }
    return null;
  }

  private handleMove(e: MouseEvent): void {
    const el = this.targetFromEvent(e);
    if (!el || el === this.lastHovered) return;
    this.lastHovered = el;
    this.drawHighlight(el);
  }

  private handleClick(e: MouseEvent): void {
    if (!this.active) return;
    const el = this.targetFromEvent(e);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const cb = this.onPick;
    this.stop({ silent: true });
    cb?.(el);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      this.stop();
    }
  }

  private drawHighlight(el: HTMLElement): void {
    if (!this.highlight) return;
    const rect = el.getBoundingClientRect();
    const box = this.highlight;
    box.style.display = "block";
    box.style.top = `${rect.top}px`;
    box.style.left = `${rect.left}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  }
}

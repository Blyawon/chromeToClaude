import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { App, type AppHandle } from "../ui/App";
import panelCss from "../ui/index.css?inline";
import type { Picker } from "./picker";

export class Inspector {
  private hostEl: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private root: Root | null = null;
  private target: HTMLElement | null = null;
  private apiRef: { current: AppHandle | null } = { current: null };

  constructor(private picker: Picker) {}

  isOpen(): boolean {
    return this.hostEl != null;
  }

  open(target: HTMLElement): void {
    if (this.isOpen()) {
      this.apiRef.current = null;
      this.root?.unmount();
      this.hostEl?.remove();
    }
    this.target = target;

    const host = document.createElement("div");
    host.style.all = "initial";
    host.setAttribute("data-chrome-to-claude", "");
    const shadow = host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = panelCss;
    shadow.appendChild(style);

    const mount = document.createElement("div");
    mount.id = "mount";
    shadow.appendChild(mount);

    // portal-root is appended LAST so its children (tooltips, popovers,
    // command palette, shortcut overlay) stack above the panel at equal z-index.
    const portalRoot = document.createElement("div");
    portalRoot.id = "portal-root";
    shadow.appendChild(portalRoot);

    document.documentElement.appendChild(host);
    this.hostEl = host;
    this.shadow = shadow;

    const startPicker = (onPick: (el: HTMLElement) => void) => {
      this.picker.startReplace(onPick);
    };
    const stopPicker = () => this.picker.stop();
    const onClose = () => this.close();

    this.root = createRoot(mount);
    this.root.render(
      createElement(App, {
        shadowRoot: shadow,
        initialTarget: target,
        startPicker,
        stopPicker,
        onClose,
        apiRef: this.apiRef,
      }),
    );
  }

  rePick(): void {
    this.apiRef.current?.rePick();
  }

  close(): void {
    this.picker.stop({ silent: true });
    this.apiRef.current = null;
    this.root?.unmount();
    this.root = null;
    this.hostEl?.remove();
    this.hostEl = null;
    this.shadow = null;
    this.target = null;
  }
}

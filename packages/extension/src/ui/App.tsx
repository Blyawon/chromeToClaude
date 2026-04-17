import * as React from "react";
import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import {
  Copy,
  Crosshair,
  Eraser,
  FileCode2,
  Keyboard,
  Redo2,
  RotateCcw,
  Send,
  Sparkles,
  Undo2,
  Plus,
} from "lucide-react";
import { buildSelector } from "../content/selector";
import { detectFramework } from "../content/framework";
import { ShadowRootContext } from "./lib/shadow";
import { useInspectorStore } from "./state";
import { useHotkey } from "./lib/hotkeys";
import { loadHostPrefs, patchHostPrefs } from "./lib/persistence";
import { Header } from "./components/Header";
import { PromptBlock } from "./components/PromptBlock";
import { ElementMeta } from "./components/ElementMeta";
import { DaemonBanner } from "./components/DaemonBanner";
import { ShortcutOverlay } from "./components/ShortcutOverlay";
import { CommandPalette, type CommandItem } from "./components/CommandPalette";
import { QueueList } from "./components/QueueList";
import { SectionErrorBoundary } from "./components/SectionErrorBoundary";
import { TypographySection } from "./components/sections/TypographySection";
import { LayoutSection } from "./components/sections/LayoutSection";
import { PositionSection } from "./components/sections/PositionSection";
import { FillSection } from "./components/sections/FillSection";
import { StrokeSection } from "./components/sections/StrokeSection";
import { EffectsSection } from "./components/sections/EffectsSection";
import { TooltipProvider } from "./ui/tooltip";
import { Toast, ToastProvider, ToastViewport } from "./ui/toast";
import { panelMotion } from "./lib/motion";
import { AddToPromptContext } from "./primitives/PropertyInput";

export interface AppHandle {
  rePick(): void;
}

export interface AppProps {
  shadowRoot: ShadowRoot;
  initialTarget: HTMLElement;
  startPicker: (onPick: (el: HTMLElement) => void) => void;
  stopPicker: () => void;
  onClose: () => void;
  apiRef?: React.MutableRefObject<AppHandle | null>;
}

const DEFAULT_WIDTH = 320;

function clampPosition(x: number, y: number, w: number, h: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.max(8 - w + 60, Math.min(vw - 60, x)),
    y: Math.max(8, Math.min(vh - 60, y)),
  };
}

/** Format one or many style edits as a markdown-ish snippet that reads well in a prompt. */
function formatEditSnippet(prop: string, oldValue: string, newValue: string): string {
  return `- change \`${prop}\` from \`${oldValue || "(none)"}\` to \`${newValue}\``;
}

function appendLinesToPrompt(prev: string, lines: string[]): string {
  if (lines.length === 0) return prev;
  const trimmed = prev.trimEnd();
  const sep = trimmed.length === 0 ? "" : "\n";
  return trimmed + sep + lines.join("\n") + "\n";
}

export function App({
  shadowRoot,
  initialTarget,
  startPicker,
  stopPicker,
  onClose,
  apiRef,
}: AppProps) {
  const store = useInspectorStore({ initialTarget });
  const [prompt, setPrompt] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [toast, setToast] = React.useState<{ key: number; msg: string; variant?: "default" | "error" | "success" } | null>(null);
  const [width, setWidth] = React.useState(DEFAULT_WIDTH);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const x = useMotionValue(
    typeof window !== "undefined" ? window.innerWidth - DEFAULT_WIDTH - 12 : 800,
  );
  const y = useMotionValue(12);

  React.useEffect(() => {
    let mounted = true;
    void loadHostPrefs().then((p) => {
      if (!mounted) return;
      if (p.width && p.width >= 280 && p.width <= 440) setWidth(p.width);
      if (p.position) {
        const { x: px, y: py } = clampPosition(
          p.position.x,
          p.position.y,
          p.width ?? DEFAULT_WIDTH,
          window.innerHeight * 0.8,
        );
        x.set(px);
        y.set(py);
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rePick = React.useCallback(() => {
    store.setMode("picking");
    startPicker((el) => {
      store.setTarget(el);
      store.setMode("idle");
    });
  }, [store, startPicker]);

  React.useEffect(() => {
    if (!apiRef) return;
    apiRef.current = { rePick };
    return () => {
      if (apiRef.current?.rePick === rePick) apiRef.current = null;
    };
  }, [apiRef, rePick]);

  React.useEffect(() => {
    return () => {
      if (store.mode === "picking") stopPicker();
    };
  }, [store.mode, stopPicker]);

  const onTogglePicker = () => {
    if (store.mode === "picking") {
      stopPicker();
      store.setMode("idle");
    } else {
      rePick();
    }
  };

  const onAddToQueue = React.useCallback(() => {
    const res = store.addToQueue(prompt);
    if (res.ok) {
      setPrompt("");
      setToast({ key: Date.now(), msg: `Added to queue`, variant: "success" });
    } else {
      setToast({ key: Date.now(), msg: res.error, variant: "error" });
    }
  }, [store, prompt]);

  const onSendQueue = React.useCallback(async () => {
    if (sending) return;
    if (store.queue.length === 0) return;
    setSending(true);
    const res = await store.sendQueue();
    setSending(false);
    if (res.ok) {
      setToast({
        key: Date.now(),
        msg: `Sent ${res.sent} selection${res.sent === 1 ? "" : "s"} to Claude`,
        variant: "success",
      });
    } else {
      setToast({ key: Date.now(), msg: res.error, variant: "error" });
    }
  }, [sending, store]);

  // Add-to-prompt: single edit
  const handleAddEditToPrompt = React.useCallback(
    (prop: string, oldValue: string, newValue: string) => {
      setPrompt((prev) => appendLinesToPrompt(prev, [formatEditSnippet(prop, oldValue, newValue)]));
    },
    [],
  );

  // Add-to-prompt: all current edits
  const handleIncludeAllEdits = React.useCallback(() => {
    const lines: string[] = [];
    for (const prop of Object.keys(store.edited)) {
      const oldV = (store.baseline[prop] ?? "").trim();
      const newV = (store.edited[prop] ?? "").trim();
      if (oldV !== newV) lines.push(formatEditSnippet(prop, oldV, newV));
    }
    if (lines.length === 0) {
      setToast({ key: Date.now(), msg: "No edits yet", variant: "error" });
      return;
    }
    setPrompt((prev) => appendLinesToPrompt(prev, lines));
  }, [store.edited, store.baseline]);

  // Hotkeys — kept intentionally minimal. Everything else lives in the palette.
  // Undo/redo are scoped OUT of editable fields so they don't hijack native
  // textarea undo while the user is typing a prompt.
  useHotkey("mod+z", () => store.undo());
  useHotkey(["mod+shift+z", "mod+y"], () => store.redo());
  useHotkey("mod+k", () => setPaletteOpen((v) => !v), { allowInEditable: true });
  useHotkey("mod+shift+enter", () => void onSendQueue(), { allowInEditable: true });
  // Listen on the `?` character directly — "shift+/" doesn't produce `?` on
  // non-US keyboard layouts (e.g. DE/FR), which broke the help overlay there.
  useHotkey("?", () => setShortcutsOpen((v) => !v));
  useHotkey(
    "escape",
    () => {
      if (paletteOpen) {
        setPaletteOpen(false);
        return;
      }
      if (shortcutsOpen) {
        setShortcutsOpen(false);
        return;
      }
      if (store.mode === "picking") {
        stopPicker();
        store.setMode("idle");
        return;
      }
      return false;
    },
    { allowInEditable: true },
  );

  // Drag
  const onDragHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = x.get();
    const baseY = y.get();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const rect = panelRef.current?.getBoundingClientRect();
      const w = rect?.width ?? width;
      const h = rect?.height ?? 500;
      const { x: nx, y: ny } = clampPosition(baseX + dx, baseY + dy, w, h);
      x.set(nx);
      y.set(ny);
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      void patchHostPrefs({ position: { x: x.get(), y: y.get() }, width });
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  // Resize
  const resizeRef = React.useRef<{ startX: number; startWidth: number; baseX: number } | null>(null);
  const onResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    resizeRef.current = { startX: e.clientX, startWidth: width, baseX: x.get() };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = resizeRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const nextWidth = Math.max(280, Math.min(440, d.startWidth - dx));
    const delta = nextWidth - d.startWidth;
    setWidth(nextWidth);
    x.set(d.baseX - delta);
  };
  const onResizeUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    void patchHostPrefs({ width, position: { x: x.get(), y: y.get() } });
  };

  const tag = store.target.tagName.toLowerCase();
  const framework = React.useMemo(
    () => detectFramework(store.target),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.target, store.generation],
  );
  const selector = React.useMemo(
    () => buildSelector(store.target),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.target, store.generation],
  );

  const values = store.edited;
  const baseline = store.baseline;
  const setStyle = store.setStyle;

  // Pull stable function refs off the store so the palette items only
  // re-memoize when the user actually changes target / framework / selector.
  const { undo, redo, resetAll, clearQueue } = store;
  const commands: CommandItem[] = React.useMemo(
    () => [
      { id: "pick", label: "Pick new element", shortcut: "cmd shift e", group: "Actions", icon: <Crosshair size={13} />, run: () => rePick() },
      { id: "add", label: "Add prompt to queue", shortcut: "cmd enter", group: "Actions", icon: <Plus size={13} />, run: () => onAddToQueue() },
      { id: "send-all", label: "Send queue to Claude", shortcut: "cmd shift enter", group: "Actions", icon: <Send size={13} />, run: () => void onSendQueue() },
      { id: "include-edits", label: "Include all edits in prompt", group: "Actions", icon: <Sparkles size={13} />, run: () => handleIncludeAllEdits() },
      { id: "undo", label: "Undo", shortcut: "cmd z", group: "Edits", icon: <Undo2 size={13} />, run: () => undo() },
      { id: "redo", label: "Redo", shortcut: "cmd shift z", group: "Edits", icon: <Redo2 size={13} />, run: () => redo() },
      { id: "reset-all", label: "Reset all edits", group: "Edits", icon: <RotateCcw size={13} />, keywords: ["revert", "discard"], run: () => resetAll() },
      { id: "clear-prompt", label: "Clear prompt", group: "Edits", icon: <Eraser size={13} />, run: () => setPrompt("") },
      { id: "clear-queue", label: "Clear queue", group: "Edits", icon: <Eraser size={13} />, run: () => clearQueue() },
      { id: "copy-selector", label: "Copy selector", group: "Copy", icon: <Copy size={13} />, run: () => void navigator.clipboard.writeText(selector) },
      ...(framework.type !== "none" && framework.sourceFile
        ? [{
            id: "copy-source",
            label: "Copy source path",
            group: "Copy",
            icon: <FileCode2 size={13} />,
            run: () => {
              const loc = framework.sourceLine != null ? `${framework.sourceFile}:${framework.sourceLine}` : framework.sourceFile!;
              void navigator.clipboard.writeText(loc);
            },
          } as CommandItem]
        : []),
      { id: "shortcuts", label: "Show keyboard shortcuts", shortcut: "?", group: "Help", icon: <Keyboard size={13} />, run: () => setShortcutsOpen(true) },
    ],
    [rePick, selector, framework, onAddToQueue, onSendQueue, handleIncludeAllEdits, undo, redo, resetAll, clearQueue],
  );

  return (
    <ShadowRootContext.Provider value={shadowRoot}>
      <TooltipProvider>
        <ToastProvider duration={2500} swipeDirection="right">
          <AddToPromptContext.Provider value={handleAddEditToPrompt}>
            <motion.div
              ref={panelRef}
              id="panel"
              style={{ x, y, width, height: "min(80vh, 720px)" }}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={panelMotion}
              className="fixed top-0 left-0 flex flex-col overflow-hidden bg-surface-default text-text-default rounded-r-lg shadow-depth-4 border border-border-default z-[2147483647]"
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize group/resize z-10"
                onPointerDown={onResizeDown}
                onPointerMove={onResizeMove}
                onPointerUp={onResizeUp}
                onPointerCancel={onResizeUp}
              >
                <div className="absolute inset-y-0 left-0 w-px bg-border-subtle group-hover/resize:bg-accent-brand transition-colors duration-120" />
              </div>

              <Header
                tag={tag}
                componentName={framework.type !== "none" ? framework.componentName : undefined}
                picking={store.mode === "picking"}
                onTogglePicker={onTogglePicker}
                onClose={onClose}
                onUndo={() => store.undo()}
                onRedo={() => store.redo()}
                canUndo={store.canUndo}
                canRedo={store.canRedo}
                onOpenPalette={() => setPaletteOpen(true)}
                dragHandleProps={{ onPointerDown: onDragHandlePointerDown }}
              />

              <DaemonBanner />

              <div className="flex-1 min-h-0 overflow-y-auto scroll-panel">
                <QueueList
                  queue={store.queue}
                  sending={sending}
                  onRemove={store.removeFromQueue}
                  onClear={store.clearQueue}
                  onSendAll={onSendQueue}
                />
                <PromptBlock
                  value={prompt}
                  onChange={setPrompt}
                  onAddToQueue={onAddToQueue}
                  changedCount={store.changedCount}
                  onIncludeAllEdits={handleIncludeAllEdits}
                  onResetAll={() => store.resetAll()}
                  disabled={sending}
                />
                <ElementMeta selector={selector} framework={framework} />
                <SectionErrorBoundary>
                  <div className="w-full">
                    <PositionSection values={values} baseline={baseline} onChange={setStyle} onCommit={store.commitStyle} onReset={store.resetStyle} />
                    <LayoutSection values={values} baseline={baseline} onChange={setStyle} onCommit={store.commitStyle} onReset={store.resetStyle} />
                    <TypographySection values={values} baseline={baseline} onChange={setStyle} onCommit={store.commitStyle} onReset={store.resetStyle} />
                    <FillSection values={values} baseline={baseline} onChange={setStyle} onCommit={store.commitStyle} onReset={store.resetStyle} />
                    <StrokeSection values={values} baseline={baseline} onChange={setStyle} onCommit={store.commitStyle} onReset={store.resetStyle} />
                    <EffectsSection values={values} baseline={baseline} onChange={setStyle} onCommit={store.commitStyle} onReset={store.resetStyle} />
                  </div>
                </SectionErrorBoundary>
              </div>

              <ToastViewport />
              <AnimatePresence>
                {toast && (
                  <Toast
                    key={toast.key}
                    variant={toast.variant === "error" ? "error" : toast.variant === "success" ? "success" : "default"}
                    duration={toast.variant === "error" ? 4000 : 2000}
                    onOpenChange={(open) => {
                      if (!open) setToast(null);
                    }}
                  >
                    {toast.msg}
                  </Toast>
                )}
              </AnimatePresence>
            </motion.div>

            <CommandPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
              items={commands}
            />
            <ShortcutOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
          </AddToPromptContext.Provider>
        </ToastProvider>
      </TooltipProvider>
    </ShadowRootContext.Provider>
  );
}

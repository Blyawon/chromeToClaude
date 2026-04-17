import * as React from "react";
import type { EnqueuePayload } from "@chrome-to-claude/shared";
import { buildSelector } from "../content/selector";
import { detectFramework } from "../content/framework";
import {
  InlineStyleOverlay,
  computeDelta,
  snapshotComputed,
} from "../content/styles";
import {
  checkDaemonHealth,
  sendToDaemon,
} from "../content/transport";
import { EditHistory, type StyleEdit } from "./lib/history";

export type InspectorMode = "idle" | "picking";

export interface QueueItem {
  id: string;
  createdAt: number;
  payload: EnqueuePayload;
  prompt: string;
  tag: string;
  componentName?: string;
  sourceFile?: string;
  deltaCount: number;
}

export interface InspectorStoreOptions {
  initialTarget: HTMLElement;
}

function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useInspectorStore({ initialTarget }: InspectorStoreOptions) {
  const [target, setTargetRaw] = React.useState<HTMLElement>(initialTarget);
  const [baseline, setBaseline] = React.useState<Record<string, string>>(() =>
    snapshotComputed(initialTarget),
  );
  const [edited, setEdited] = React.useState<Record<string, string>>(() =>
    snapshotComputed(initialTarget),
  );
  const [mode, setMode] = React.useState<InspectorMode>("idle");
  const [generation, setGeneration] = React.useState(0);
  const [historyVersion, setHistoryVersion] = React.useState(0);
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  // Mirror of `queue` for async code paths (sendQueue) that need the latest
  // value without forcing the callback to re-memoize on every queue mutation.
  const queueRef = React.useRef(queue);
  queueRef.current = queue;

  const overlayRef = React.useRef<InlineStyleOverlay | null>(
    new InlineStyleOverlay(initialTarget),
  );
  const historyRef = React.useRef(new EditHistory());
  /** Every current-value, updated on every setStyle AND commitStyle. Used as
   * the source of truth for resetStyle's "already at baseline?" check. */
  const currentRef = React.useRef<Record<string, string>>({ ...baseline });
  /** The last value that was COMMITTED (pushed to history), used for history dedup. */
  const lastCommitRef = React.useRef<Record<string, string>>({ ...baseline });

  const bumpHistory = () => setHistoryVersion((v) => v + 1);

  const setTarget = React.useCallback((next: HTMLElement) => {
    overlayRef.current?.revertAll();
    overlayRef.current = new InlineStyleOverlay(next);
    const snap = snapshotComputed(next);
    historyRef.current.clear();
    currentRef.current = { ...snap };
    lastCommitRef.current = { ...snap };
    setTargetRaw(next);
    setBaseline(snap);
    setEdited(snap);
    setGeneration((g) => g + 1);
    bumpHistory();
  }, []);

  const setStyle = React.useCallback(
    (prop: string, value: string) => {
      currentRef.current[prop] = value;
      setEdited((prev) => {
        if (prev[prop] === value) return prev;
        return { ...prev, [prop]: value };
      });
      const base = baseline[prop] ?? "";
      if (overlayRef.current) {
        if (value !== base) {
          overlayRef.current.set(prop, value);
        } else {
          overlayRef.current.set(prop, base);
        }
      }
    },
    [baseline],
  );

  const commitStyle = React.useCallback(
    (prop: string, value: string) => {
      const prev = lastCommitRef.current[prop] ?? baseline[prop] ?? "";
      if (prev === value) return;
      historyRef.current.push({
        prop,
        oldValue: prev,
        newValue: value,
        timestamp: Date.now(),
      });
      lastCommitRef.current[prop] = value;
      bumpHistory();
    },
    [baseline],
  );

  const applyEdit = React.useCallback(
    (edit: StyleEdit, direction: "old" | "new") => {
      const value = direction === "old" ? edit.oldValue : edit.newValue;
      const base = baseline[edit.prop] ?? "";
      setEdited((prev) => ({ ...prev, [edit.prop]: value }));
      overlayRef.current?.set(edit.prop, value === base ? base : value);
      currentRef.current[edit.prop] = value;
      lastCommitRef.current[edit.prop] = value;
    },
    [baseline],
  );

  const undo = React.useCallback(() => {
    const top = historyRef.current.undo();
    if (!top) return false;
    applyEdit(top, "old");
    bumpHistory();
    return true;
  }, [applyEdit]);

  const redo = React.useCallback(() => {
    const top = historyRef.current.redo();
    if (!top) return false;
    applyEdit(top, "new");
    bumpHistory();
    return true;
  }, [applyEdit]);

  const resetStyle = React.useCallback(
    (prop: string) => {
      const base = baseline[prop] ?? "";
      const current = currentRef.current[prop] ?? base;
      if (current === base) return;
      historyRef.current.push({
        prop,
        oldValue: current,
        newValue: base,
        timestamp: Date.now(),
      });
      currentRef.current[prop] = base;
      lastCommitRef.current[prop] = base;
      setEdited((prev) => ({ ...prev, [prop]: base }));
      overlayRef.current?.set(prop, base);
      bumpHistory();
    },
    [baseline],
  );

  const resetAll = React.useCallback(() => {
    for (const prop of Object.keys(baseline)) {
      const base = baseline[prop] ?? "";
      const current = currentRef.current[prop] ?? base;
      if (current !== base) {
        historyRef.current.push({
          prop,
          oldValue: current,
          newValue: base,
          timestamp: Date.now(),
        });
        currentRef.current[prop] = base;
        lastCommitRef.current[prop] = base;
        overlayRef.current?.set(prop, base);
      }
    }
    setEdited({ ...baseline });
    bumpHistory();
  }, [baseline]);

  React.useEffect(() => {
    return () => {
      overlayRef.current?.revertAll();
      overlayRef.current = null;
    };
  }, []);

  const buildPayload = React.useCallback(
    (prompt: string): { payload: EnqueuePayload; deltaCount: number } => {
      const framework = detectFramework(target);
      const selector = buildSelector(target);
      const rect = target.getBoundingClientRect();
      const delta = computeDelta(baseline, edited);
      const payload: EnqueuePayload = {
        url: location.href,
        title: document.title,
        selector,
        tagName: target.tagName.toLowerCase(),
        classes: Array.from(target.classList),
        idAttr: target.id || null,
        textContent: (target.textContent ?? "").slice(0, 500),
        outerHTML: target.outerHTML.slice(0, 2000),
        boundingBox: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        screenshotPng: null,
        framework,
        computedStyles: baseline,
        styleDelta: delta,
        prompt,
      };
      return { payload, deltaCount: delta.length };
    },
    [target, baseline, edited],
  );

  // Queue API
  const addToQueue = React.useCallback(
    (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return { ok: false as const, error: "type a prompt first" };
      const { payload, deltaCount } = buildPayload(trimmed);
      const framework = payload.framework;
      const item: QueueItem = {
        id: rid(),
        createdAt: Date.now(),
        payload,
        prompt: trimmed,
        tag: payload.tagName,
        componentName: framework.type !== "none" ? framework.componentName : undefined,
        sourceFile: framework.type !== "none" ? framework.sourceFile : undefined,
        deltaCount,
      };
      setQueue((q) => [...q, item]);
      return { ok: true as const, id: item.id };
    },
    [buildPayload],
  );

  const removeFromQueue = React.useCallback((id: string) => {
    setQueue((q) => q.filter((it) => it.id !== id));
  }, []);

  const clearQueue = React.useCallback(() => {
    setQueue([]);
  }, []);

  const sendQueue = React.useCallback(async (): Promise<
    | { ok: true; sent: number; ids: string[] }
    | { ok: false; error: string; sent: number; ids: string[] }
  > => {
    // Snapshot via functional read so concurrent addToQueue calls during the
    // async send aren't clobbered when we reconcile below.
    const snapshot = queueRef.current;
    if (snapshot.length === 0) {
      return { ok: false, error: "queue is empty", sent: 0, ids: [] };
    }
    const health = await checkDaemonHealth();
    if (!health.ok) {
      return {
        ok: false,
        error: "daemon offline — run `chrome-to-claude start`",
        sent: 0,
        ids: [],
      };
    }
    const ids: string[] = [];
    const sentLocalIds = new Set<string>();
    const failedLocalIds = new Set<string>();
    for (const item of snapshot) {
      const res = await sendToDaemon(item.payload);
      if (res.ok) {
        ids.push(res.id);
        sentLocalIds.add(item.id);
      } else {
        failedLocalIds.add(item.id);
      }
    }
    // Reconcile: remove items we successfully sent; keep everything else
    // (including items the user added during the send).
    setQueue((q) => q.filter((it) => !sentLocalIds.has(it.id)));
    if (failedLocalIds.size > 0) {
      return {
        ok: false,
        error: "some items failed to send",
        sent: ids.length,
        ids,
      };
    }
    return { ok: true, sent: ids.length, ids };
  }, []);

  // `historyRef.current` is mutated imperatively; we use `historyVersion` as
  // a dependency so memoized values recompute every time we call bumpHistory.
  const canUndo = React.useMemo(() => historyRef.current.canUndo(), [historyVersion]);
  const canRedo = React.useMemo(() => historyRef.current.canRedo(), [historyVersion]);
  const changedCount = React.useMemo(() => {
    let n = 0;
    for (const k of Object.keys(edited)) {
      if ((edited[k] ?? "").trim() !== (baseline[k] ?? "").trim()) n++;
    }
    return n;
  }, [edited, baseline]);

  return {
    mode,
    target,
    baseline,
    edited,
    setStyle,
    commitStyle,
    resetStyle,
    resetAll,
    setTarget,
    setMode,
    addToQueue,
    removeFromQueue,
    clearQueue,
    sendQueue,
    queue,
    generation,
    undo,
    redo,
    canUndo,
    canRedo,
    changedCount,
  };
}

export type InspectorStore = ReturnType<typeof useInspectorStore>;

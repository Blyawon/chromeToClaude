import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Copy, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { checkDaemonHealth } from "../../content/transport";
import { springFast } from "../lib/motion";

const CMD = "npx chrome-to-claude start";

export function DaemonBanner() {
  const [online, setOnline] = React.useState<boolean | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const check = React.useCallback(async () => {
    setChecking(true);
    const res = await checkDaemonHealth();
    setChecking(false);
    setOnline(res.ok);
  }, []);

  // Read `online` via a ref inside the interval so we don't reinstall the
  // timer every time the value flips.
  const onlineRef = React.useRef(online);
  onlineRef.current = online;

  React.useEffect(() => {
    void check();
    const id = setInterval(() => {
      if (onlineRef.current === false) void check();
    }, 3000);
    return () => clearInterval(id);
  }, [check]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <AnimatePresence initial={false}>
      {online === false && (
        <motion.div
          key="banner"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 40, mass: 0.9 }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-s-200 px-s-400 py-s-300 border-b border-border-subtle bg-edited-subtle">
            <div className="flex items-center gap-s-200 text-t-md text-text-default">
              <AlertTriangle size={14} className="text-edited shrink-0" />
              <span>Bridge daemon offline.</span>
            </div>
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={springFast}
              className="flex items-center gap-s-150 rounded-r-md bg-surface-page px-s-200 py-s-150"
            >
              <code className="flex-1 text-t-md text-text-default font-mono truncate select-all">
                {CMD}
              </code>
              <motion.button
                type="button"
                onClick={copy}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.9 }}
                transition={springFast}
                aria-label="Copy command"
                className="inline-flex h-6 w-6 items-center justify-center rounded-r-sm text-icon-tertiary hover:text-icon-default hover:bg-surface-hover"
              >
                {copied ? <Check size={12} className="text-accent-success" /> : <Copy size={12} />}
              </motion.button>
            </motion.div>
            <motion.button
              type="button"
              onClick={check}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={springFast}
              className="inline-flex items-center gap-s-150 text-t-sm text-text-secondary hover:text-text-default self-start transition-colors duration-120"
            >
              <RefreshCw
                size={11}
                className={cn("transition-transform duration-120", checking && "animate-spin")}
              />
              {checking ? "Checking…" : "Retry"}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

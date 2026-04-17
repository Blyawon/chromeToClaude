import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, FileCode2 } from "lucide-react";
import type { FrameworkInfo } from "@chrome-to-claude/shared";
import { cn } from "../lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { springFast } from "../lib/motion";

export interface ElementMetaProps {
  selector: string;
  framework: FrameworkInfo;
}

export function ElementMeta({ selector, framework }: ElementMetaProps) {
  const [copied, setCopied] = React.useState<"selector" | "source" | null>(null);

  const copy = async (text: string, kind: "selector" | "source") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  const source =
    framework.type !== "none" && framework.sourceFile
      ? framework.sourceLine != null
        ? `${framework.sourceFile}:${framework.sourceLine}`
        : framework.sourceFile
      : null;

  return (
    <div className="px-s-400 py-s-200 border-b border-border-subtle flex flex-col gap-s-150">
      <MetaRow
        icon={null}
        text={selector}
        title="CSS selector"
        copied={copied === "selector"}
        onCopy={() => copy(selector, "selector")}
      />
      {source && (
        <MetaRow
          icon={<FileCode2 size={11} />}
          text={source}
          title="Source file"
          copied={copied === "source"}
          onCopy={() => copy(source, "source")}
        />
      )}
    </div>
  );
}

function MetaRow({
  icon,
  text,
  title,
  copied,
  onCopy,
}: {
  icon: React.ReactNode | null;
  text: string;
  title: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="group flex items-center gap-s-150 text-t-sm">
      {icon && <span className="shrink-0 text-icon-tertiary">{icon}</span>}
      <span
        className="flex-1 truncate font-mono text-text-secondary"
        title={text}
      >
        {text}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            aria-label={`Copy ${title.toLowerCase()}`}
            onClick={onCopy}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            transition={springFast}
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-r-sm",
              "text-icon-tertiary hover:text-icon-default hover:bg-surface-hover",
              "transition-colors duration-120",
              "opacity-0 group-hover:opacity-100",
              copied && "opacity-100 text-accent-success",
            )}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  transition={springFast}
                >
                  <Check size={11} />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={springFast}
                >
                  <Copy size={11} />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {copied ? "Copied" : `Copy ${title.toLowerCase()}`}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

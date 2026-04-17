import * as React from "react";

let lockCount = 0;
let savedStyles: {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPaddingRight: string;
} | null = null;

function scrollbarWidth(): number {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function lock() {
  if (lockCount === 0) {
    savedStyles = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPaddingRight: document.body.style.paddingRight,
    };
    const sw = scrollbarWidth();
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (sw > 0) {
      document.body.style.paddingRight = `${sw}px`;
    }
  }
  lockCount++;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && savedStyles) {
    document.documentElement.style.overflow = savedStyles.htmlOverflow;
    document.body.style.overflow = savedStyles.bodyOverflow;
    document.body.style.paddingRight = savedStyles.bodyPaddingRight;
    savedStyles = null;
  }
}

export function useScrollLock(active: boolean): void {
  React.useEffect(() => {
    if (!active) return;
    lock();
    return () => unlock();
  }, [active]);
}

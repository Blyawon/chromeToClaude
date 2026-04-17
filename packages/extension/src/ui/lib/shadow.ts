import { createContext, useContext } from "react";

export const ShadowRootContext = createContext<ShadowRoot | null>(null);

export function useShadowRoot(): ShadowRoot | null {
  return useContext(ShadowRootContext);
}

export function usePortalContainer(): HTMLElement | null {
  const shadow = useShadowRoot();
  if (!shadow) return null;
  return shadow.querySelector<HTMLElement>("#portal-root");
}

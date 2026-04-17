import * as React from "react";

export type AddToPromptFn = (
  prop: string,
  oldValue: string,
  newValue: string,
) => void;

export const AddToPromptContext = React.createContext<AddToPromptFn | null>(null);

export interface SectionBaseProps {
  values: Record<string, string>;
  baseline: Record<string, string>;
  onChange: (prop: string, value: string) => void;
  onCommit: (prop: string, value: string) => void;
  onReset: (prop: string) => void;
}

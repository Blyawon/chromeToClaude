import {
  ArrowDown,
  ArrowRight,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";
import { Section } from "../../primitives/Section";
import { PropertyInput } from "../../primitives/PropertyInput";
import { Select } from "../../primitives/Select";
import type { SectionBaseProps } from "./types";

export type PositionSectionProps = SectionBaseProps;

const POSITION_OPTIONS = [
  { value: "static" },
  { value: "relative" },
  { value: "absolute" },
  { value: "fixed" },
  { value: "sticky" },
];

export function PositionSection({
  values,
  baseline,
  onChange,
  onCommit,
  onReset,
}: PositionSectionProps) {
  const row = (prop: string, extra: Partial<Parameters<typeof PropertyInput>[0]> = {}) => (
    <PropertyInput
      propertyName={prop}
      value={values[prop] ?? ""}
      baseline={baseline[prop]}
      onChange={(v) => onChange(prop, v)}
      onCommit={(v) => onCommit(prop, v)}
      onReset={() => onReset(prop)}
      {...extra}
    />
  );

  return (
    <Section id="position" title="Position">
      <Select
        value={values["position"] ?? "static"}
        baseline={baseline["position"]}
        propertyName="position"
        onChange={(v) => {
          onChange("position", v);
          onCommit("position", v);
        }}
        onReset={() => onReset("position")}
        options={POSITION_OPTIONS}
      />
      <div className="grid grid-cols-2 gap-1">
        {row("left", { label: "X", placeholder: "auto" })}
        {row("top", { label: "Y", placeholder: "auto" })}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {row("width", { icon: <MoveHorizontal size={12} /> })}
        {row("height", { icon: <MoveVertical size={12} /> })}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {row("min-width", { icon: <ArrowRight size={12} />, placeholder: "min" })}
        {row("min-height", { icon: <ArrowDown size={12} />, placeholder: "min" })}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {row("z-index", { label: "Z", placeholder: "auto", dragScrub: true })}
      </div>
    </Section>
  );
}

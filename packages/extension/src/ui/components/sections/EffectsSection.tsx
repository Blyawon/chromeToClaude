import { Section } from "../../primitives/Section";
import { PropertyInput } from "../../primitives/PropertyInput";
import { Select } from "../../primitives/Select";
import type { SectionBaseProps } from "./types";

export type EffectsSectionProps = SectionBaseProps;

const CURSOR_OPTIONS = [
  { value: "auto" },
  { value: "default" },
  { value: "pointer" },
  { value: "text" },
  { value: "wait" },
  { value: "help" },
  { value: "move" },
  { value: "crosshair" },
  { value: "not-allowed" },
  { value: "grab" },
  { value: "grabbing" },
  { value: "copy" },
  { value: "alias" },
  { value: "context-menu" },
  { value: "cell" },
  { value: "vertical-text" },
  { value: "progress" },
  { value: "zoom-in" },
  { value: "zoom-out" },
  { value: "none" },
  { value: "n-resize" },
  { value: "e-resize" },
  { value: "s-resize" },
  { value: "w-resize" },
  { value: "ns-resize" },
  { value: "ew-resize" },
  { value: "nesw-resize" },
  { value: "nwse-resize" },
  { value: "col-resize" },
  { value: "row-resize" },
];

const TEXT_PROPS: Array<[string, string]> = [
  ["box-shadow", "shadow"],
  ["transform", "transform"],
  ["transition", "transition"],
];

export function EffectsSection({
  values,
  baseline,
  onChange,
  onCommit,
  onReset,
}: EffectsSectionProps) {
  return (
    <Section id="effects" title="Effects">
      {TEXT_PROPS.map(([prop, label]) => (
        <div key={prop} className="flex items-center gap-s-200">
          <span className="text-t-sm text-text-tertiary w-16 shrink-0">{label}</span>
          <div className="flex-1 min-w-0">
            <PropertyInput
              propertyName={prop}
              value={values[prop] ?? ""}
              baseline={baseline[prop]}
              onChange={(v) => onChange(prop, v)}
              onCommit={(v) => onCommit(prop, v)}
              onReset={() => onReset(prop)}
              dragScrub={false}
            />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-s-200">
        <span className="text-t-sm text-text-tertiary w-16 shrink-0">cursor</span>
        <div className="flex-1 min-w-0">
          <Select
            value={values["cursor"] ?? "auto"}
            baseline={baseline["cursor"]}
            propertyName="cursor"
            onChange={(v) => {
              onChange("cursor", v);
              onCommit("cursor", v);
            }}
            onReset={() => onReset("cursor")}
            options={CURSOR_OPTIONS}
          />
        </div>
      </div>
    </Section>
  );
}

import * as React from "react";
import { Link2, Link2Off } from "lucide-react";
import { Section } from "../../primitives/Section";
import { PropertyInput } from "../../primitives/PropertyInput";
import { ColorField } from "../../primitives/ColorField";
import { Select } from "../../primitives/Select";
import { IconToggleButton } from "../../primitives/IconToggleButton";
import type { SectionBaseProps } from "./types";

export type StrokeSectionProps = SectionBaseProps;

const STYLE_OPTIONS = [
  { value: "none" },
  { value: "solid" },
  { value: "dashed" },
  { value: "dotted" },
  { value: "double" },
];

const CORNER_PROPS = [
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
] as const;

function cornersOf(v: Record<string, string>) {
  const all = v["border-radius"] ?? "0px";
  return {
    tl: v["border-top-left-radius"] ?? all,
    tr: v["border-top-right-radius"] ?? all,
    br: v["border-bottom-right-radius"] ?? all,
    bl: v["border-bottom-left-radius"] ?? all,
  };
}

export function StrokeSection({
  values,
  baseline,
  onChange,
  onCommit,
  onReset,
}: StrokeSectionProps) {
  const borderColor = values["border-color"] ?? "";
  const borderWidth = values["border-width"] ?? "0px";
  const borderStyle = values["border-style"] ?? "solid";

  const r = cornersOf(values);
  const uniform = r.tl === r.tr && r.tr === r.br && r.br === r.bl;
  const [individualRadius, setIndividualRadius] = React.useState(!uniform);

  const setAllRadii = (v: string) => {
    onChange("border-radius", v);
    for (const p of CORNER_PROPS) onChange(p, v);
  };
  const commitAllRadii = (v: string) => {
    onCommit("border-radius", v);
    for (const p of CORNER_PROPS) onCommit(p, v);
  };

  return (
    <Section id="stroke" title="Stroke">
      <ColorField
        value={borderColor}
        baseline={baseline["border-color"]}
        propertyName="border-color"
        onChange={(v) => onChange("border-color", v)}
        onCommit={(v) => onCommit("border-color", v)}
        onReset={() => onReset("border-color")}
      />
      <div className="grid grid-cols-2 gap-1">
        <PropertyInput
          label="W"
          propertyName="border-width"
          value={borderWidth}
          baseline={baseline["border-width"]}
          onChange={(v) => onChange("border-width", v)}
          onCommit={(v) => onCommit("border-width", v)}
          onReset={() => onReset("border-width")}
        />
        <Select
          value={borderStyle}
          baseline={baseline["border-style"]}
          propertyName="border-style"
          onChange={(v) => {
            onChange("border-style", v);
            onCommit("border-style", v);
          }}
          onReset={() => onReset("border-style")}
          options={STYLE_OPTIONS}
        />
      </div>

      <div className="flex items-start gap-1">
        <div className="flex-1 min-w-0">
          <div className="text-t-xs text-text-tertiary mb-1">Corner radius</div>
          {!individualRadius ? (
            <PropertyInput
              label="R"
              propertyName="border-radius"
              value={r.tl}
              baseline={baseline["border-radius"]}
              onChange={setAllRadii}
              onCommit={commitAllRadii}
              onReset={() => onReset("border-radius")}
            />
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {([
                ["tl", "border-top-left-radius", "↖"],
                ["tr", "border-top-right-radius", "↗"],
                ["bl", "border-bottom-left-radius", "↙"],
                ["br", "border-bottom-right-radius", "↘"],
              ] as const).map(([k, prop, glyph]) => (
                <PropertyInput
                  key={k}
                  propertyName={prop}
                  label={glyph}
                  value={r[k]}
                  baseline={baseline[prop]}
                  onChange={(v) => onChange(prop, v)}
                  onCommit={(v) => onCommit(prop, v)}
                  onReset={() => onReset(prop)}
                />
              ))}
            </div>
          )}
        </div>
        <IconToggleButton
          icon={individualRadius ? <Link2Off size={14} /> : <Link2 size={14} />}
          active={individualRadius}
          onChange={setIndividualRadius}
          label={individualRadius ? "Link corners" : "Split corners"}
        />
      </div>
    </Section>
  );
}

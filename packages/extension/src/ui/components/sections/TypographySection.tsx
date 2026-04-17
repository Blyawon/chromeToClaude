import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Type,
} from "lucide-react";
import { Section } from "../../primitives/Section";
import { PropertyInput } from "../../primitives/PropertyInput";
import { Select } from "../../primitives/Select";
import { IconToggleButton } from "../../primitives/IconToggleButton";
import { ColorField } from "../../primitives/ColorField";
import { EditedFieldShell } from "../../primitives/EditedFieldShell";
import { useEdited } from "../../lib/edited";

import type { SectionBaseProps } from "./types";

export type TypographySectionProps = SectionBaseProps;

const WEIGHT_OPTIONS = [
  { value: "100", label: "100 Thin" },
  { value: "200", label: "200 Extra Light" },
  { value: "300", label: "300 Light" },
  { value: "400", label: "400 Regular" },
  { value: "500", label: "500 Medium" },
  { value: "600", label: "600 Semibold" },
  { value: "700", label: "700 Bold" },
  { value: "800", label: "800 Extra Bold" },
  { value: "900", label: "900 Black" },
];

export function TypographySection({
  values,
  baseline,
  onChange,
  onCommit,
  onReset,
}: TypographySectionProps) {
  const align = (values["text-align"] ?? "").trim();
  const alignEdited = useEdited(align, baseline["text-align"]);
  const ff = values["font-family"];
  const setAlign = (v: string) => {
    onChange("text-align", v);
    onCommit("text-align", v);
  };
  return (
    <Section id="typography" title="Typography">
      {ff && (
        <PropertyInput
          icon={<Type size={12} />}
          propertyName="font-family"
          value={ff}
          baseline={baseline["font-family"]}
          onChange={(v) => onChange("font-family", v)}
          onCommit={(v) => onCommit("font-family", v)}
          onReset={() => onReset("font-family")}
          dragScrub={false}
        />
      )}
      <div className="grid grid-cols-2 gap-1">
        <PropertyInput
          label="Aa"
          propertyName="font-size"
          value={values["font-size"] ?? ""}
          baseline={baseline["font-size"]}
          onChange={(v) => onChange("font-size", v)}
          onCommit={(v) => onCommit("font-size", v)}
          onReset={() => onReset("font-size")}
        />
        <Select
          value={normalizeWeight(values["font-weight"] ?? "400")}
          baseline={baseline["font-weight"]}
          propertyName="font-weight"
          onChange={(v) => {
            onChange("font-weight", v);
            onCommit("font-weight", v);
          }}
          onReset={() => onReset("font-weight")}
          options={WEIGHT_OPTIONS}
        />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <PropertyInput
          label="LH"
          propertyName="line-height"
          value={values["line-height"] ?? ""}
          baseline={baseline["line-height"]}
          onChange={(v) => onChange("line-height", v)}
          onCommit={(v) => onCommit("line-height", v)}
          onReset={() => onReset("line-height")}
        />
        <PropertyInput
          label="LS"
          propertyName="letter-spacing"
          value={values["letter-spacing"] ?? ""}
          baseline={baseline["letter-spacing"]}
          onChange={(v) => onChange("letter-spacing", v)}
          onCommit={(v) => onCommit("letter-spacing", v)}
          onReset={() => onReset("letter-spacing")}
          step={0.1}
        />
      </div>
      {values["color"] && (
        <ColorField
          value={values["color"]}
          baseline={baseline["color"]}
          propertyName="color"
          onChange={(v) => onChange("color", v)}
          onCommit={(v) => onCommit("color", v)}
          onReset={() => onReset("color")}
        />
      )}
      <EditedFieldShell
        edited={alignEdited}
        onReset={() => onReset("text-align")}
      >
        <div className="flex flex-1 items-center gap-0.5 pl-s-100">
          <IconToggleButton
            icon={<AlignLeft size={14} />}
            active={align === "left" || align === "start"}
            onChange={() => setAlign("left")}
            label="Align left"
          />
          <IconToggleButton
            icon={<AlignCenter size={14} />}
            active={align === "center"}
            onChange={() => setAlign("center")}
            label="Align center"
          />
          <IconToggleButton
            icon={<AlignRight size={14} />}
            active={align === "right" || align === "end"}
            onChange={() => setAlign("right")}
            label="Align right"
          />
          <IconToggleButton
            icon={<AlignJustify size={14} />}
            active={align === "justify"}
            onChange={() => setAlign("justify")}
            label="Justify"
          />
        </div>
      </EditedFieldShell>
    </Section>
  );
}

function normalizeWeight(raw: string): string {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    if (/bold/i.test(raw)) return "700";
    if (/normal/i.test(raw)) return "400";
    return "400";
  }
  const bucket = Math.round(n / 100) * 100;
  return String(Math.max(100, Math.min(900, bucket)));
}

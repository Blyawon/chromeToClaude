import { Section } from "../../primitives/Section";
import { ColorField } from "../../primitives/ColorField";
import { PropertyInput } from "../../primitives/PropertyInput";
import { isGradient } from "../../lib/colors";
import type { SectionBaseProps } from "./types";

export type FillSectionProps = SectionBaseProps;

const FILL_PROPS = ["background-color", "background-image"] as const;

function fillValue(values: Record<string, string>): string {
  const img = values["background-image"];
  if (img && img.trim() && img.trim() !== "none") return img;
  return values["background-color"] ?? "";
}

function fillBaseline(baseline: Record<string, string>): string | undefined {
  const img = baseline["background-image"];
  if (img && img.trim() && img.trim() !== "none") return img;
  return baseline["background-color"];
}

export function FillSection({
  values,
  baseline,
  onChange,
  onCommit,
  onReset,
}: FillSectionProps) {
  const value = fillValue(values);
  const base = fillBaseline(baseline);

  const writeFill = (next: string, write: (prop: string, v: string) => void) => {
    if (isGradient(next)) {
      write("background-image", next);
      write("background-color", "transparent");
    } else {
      write("background-color", next);
      write("background-image", "none");
    }
  };

  return (
    <Section id="fill" title="Fill">
      <ColorField
        value={value}
        baseline={base}
        propertyName={isGradient(value) ? "background-image" : "background-color"}
        onChange={(v) => writeFill(v, onChange)}
        onCommit={(v) => writeFill(v, onCommit)}
        onReset={() => {
          for (const p of FILL_PROPS) onReset(p);
        }}
      />
      {values["opacity"] !== undefined && (
        <PropertyInput
          label="O"
          propertyName="opacity"
          value={values["opacity"] ?? "1"}
          baseline={baseline["opacity"]}
          onChange={(v) => onChange("opacity", v)}
          onCommit={(v) => onCommit("opacity", v)}
          onReset={() => onReset("opacity")}
          step={0.05}
          min={0}
          max={1}
          fallbackUnit=""
        />
      )}
    </Section>
  );
}

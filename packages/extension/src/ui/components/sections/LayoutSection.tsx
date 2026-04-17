import * as React from "react";
import {
  ArrowDownUp,
  ArrowLeftRight,
  MoveHorizontal,
  MoveVertical,
  Rows3,
  Columns3,
  Link2,
  Link2Off,
  Space,
} from "lucide-react";
import { Section } from "../../primitives/Section";
import { PropertyInput } from "../../primitives/PropertyInput";
import { Select } from "../../primitives/Select";
import { IconToggleButton } from "../../primitives/IconToggleButton";
import { AlignmentPad, type AlignKey } from "../../primitives/AlignmentPad";
import type { SectionBaseProps } from "./types";

export type LayoutSectionProps = SectionBaseProps;

const DISPLAY_OPTIONS = [
  { value: "block" },
  { value: "inline" },
  { value: "inline-block" },
  { value: "flex" },
  { value: "inline-flex" },
  { value: "grid" },
  { value: "inline-grid" },
  { value: "none" },
];

function sidesOf(values: Record<string, string>, base: "padding" | "margin") {
  return {
    top: values[`${base}-top`] ?? "",
    right: values[`${base}-right`] ?? "",
    bottom: values[`${base}-bottom`] ?? "",
    left: values[`${base}-left`] ?? "",
  };
}

function sym(a: string, b: string): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

export function LayoutSection({
  values,
  baseline,
  onChange,
  onCommit,
  onReset,
}: LayoutSectionProps) {
  const display = values["display"] ?? "block";
  const isFlex = display.includes("flex");
  const pad = sidesOf(values, "padding");
  const mar = sidesOf(values, "margin");
  const [padIndividual, setPadIndividual] = React.useState(
    !(sym(pad.top, pad.bottom) && sym(pad.left, pad.right)),
  );
  const [marIndividual, setMarIndividual] = React.useState(
    !(sym(mar.top, mar.bottom) && sym(mar.left, mar.right)),
  );

  const justify = (values["justify-content"] ?? "flex-start") as AlignKey;
  const align = (values["align-items"] ?? "flex-start") as AlignKey;

  return (
    <Section id="layout" title="Layout">
      <Select
        value={display}
        baseline={baseline["display"]}
        propertyName="display"
        onChange={(v) => {
          onChange("display", v);
          onCommit("display", v);
        }}
        onReset={() => onReset("display")}
        options={DISPLAY_OPTIONS}
      />

      {isFlex && (
        <>
          <div className="flex items-center gap-0.5">
            <IconToggleButton
              icon={<Columns3 size={14} />}
              active={(values["flex-direction"] ?? "row").startsWith("row")}
              onChange={() => {
                onChange("flex-direction", "row");
                onCommit("flex-direction", "row");
              }}
              label="Row"
            />
            <IconToggleButton
              icon={<Rows3 size={14} />}
              active={(values["flex-direction"] ?? "row").startsWith("column")}
              onChange={() => {
                onChange("flex-direction", "column");
                onCommit("flex-direction", "column");
              }}
              label="Column"
            />
            <IconToggleButton
              icon={<ArrowLeftRight size={14} />}
              active={values["flex-direction"] === "row-reverse"}
              onChange={() => {
                onChange("flex-direction", "row-reverse");
                onCommit("flex-direction", "row-reverse");
              }}
              label="Row reverse"
            />
            <IconToggleButton
              icon={<ArrowDownUp size={14} />}
              active={values["flex-direction"] === "column-reverse"}
              onChange={() => {
                onChange("flex-direction", "column-reverse");
                onCommit("flex-direction", "column-reverse");
              }}
              label="Column reverse"
            />
          </div>
          <div className="flex items-start gap-2">
            <AlignmentPad
              justify={justify}
              align={align}
              onChange={(next) => {
                onChange("justify-content", next.justify);
                onCommit("justify-content", next.justify);
                onChange("align-items", next.align);
                onCommit("align-items", next.align);
              }}
            />
            <div className="flex-1 flex flex-col gap-1">
              <PropertyInput
                propertyName="gap"
                icon={<Space size={12} />}
                value={values["gap"] ?? "0px"}
                baseline={baseline["gap"]}
                onChange={(v) => onChange("gap", v)}
                onCommit={(v) => onCommit("gap", v)}
                onReset={() => onReset("gap")}
                placeholder="gap"
              />
            </div>
          </div>
        </>
      )}

      <Box
        label="Padding"
        base="padding"
        individual={padIndividual}
        onIndividualChange={setPadIndividual}
        values={values}
        baseline={baseline}
        onChange={onChange}
        onCommit={onCommit}
        onReset={onReset}
      />
      <Box
        label="Margin"
        base="margin"
        individual={marIndividual}
        onIndividualChange={setMarIndividual}
        values={values}
        baseline={baseline}
        onChange={onChange}
        onCommit={onCommit}
        onReset={onReset}
      />
    </Section>
  );
}

function Box({
  label,
  base,
  individual,
  onIndividualChange,
  values,
  baseline,
  onChange,
  onCommit,
  onReset,
}: {
  label: string;
  base: "padding" | "margin";
  individual: boolean;
  onIndividualChange: (v: boolean) => void;
  values: Record<string, string>;
  baseline: Record<string, string>;
  onChange: (prop: string, value: string) => void;
  onCommit: (prop: string, value: string) => void;
  onReset: (prop: string) => void;
}) {
  const setAxis = (axis: "x" | "y", v: string) => {
    if (axis === "x") {
      onChange(`${base}-left`, v);
      onChange(`${base}-right`, v);
    } else {
      onChange(`${base}-top`, v);
      onChange(`${base}-bottom`, v);
    }
  };
  const commitAxis = (axis: "x" | "y", v: string) => {
    if (axis === "x") {
      onCommit(`${base}-left`, v);
      onCommit(`${base}-right`, v);
    } else {
      onCommit(`${base}-top`, v);
      onCommit(`${base}-bottom`, v);
    }
  };
  const sides = sidesOf(values, base);
  const resetAxis = (axis: "x" | "y") => {
    if (axis === "x") {
      onReset(`${base}-left`);
      onReset(`${base}-right`);
    } else {
      onReset(`${base}-top`);
      onReset(`${base}-bottom`);
    }
  };

  return (
    <div className="flex items-start gap-1">
      <div className="flex-1 min-w-0">
        <div className="text-t-xs text-text-tertiary mb-1">{label}</div>
        {!individual ? (
          <div className="grid grid-cols-2 gap-1">
            <PropertyInput
              propertyName={`${base} (x)`}
              icon={<MoveHorizontal size={12} />}
              value={sides.left || sides.right}
              baseline={baseline[`${base}-left`]}
              onChange={(v) => setAxis("x", v)}
              onCommit={(v) => commitAxis("x", v)}
              onReset={() => resetAxis("x")}
            />
            <PropertyInput
              propertyName={`${base} (y)`}
              icon={<MoveVertical size={12} />}
              value={sides.top || sides.bottom}
              baseline={baseline[`${base}-top`]}
              onChange={(v) => setAxis("y", v)}
              onCommit={(v) => commitAxis("y", v)}
              onReset={() => resetAxis("y")}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <PropertyInput
                key={side}
                propertyName={`${base}-${side}`}
                label={side[0].toUpperCase()}
                value={sides[side]}
                baseline={baseline[`${base}-${side}`]}
                onChange={(v) => onChange(`${base}-${side}`, v)}
                onCommit={(v) => onCommit(`${base}-${side}`, v)}
                onReset={() => onReset(`${base}-${side}`)}
              />
            ))}
          </div>
        )}
      </div>
      <IconToggleButton
        icon={individual ? <Link2Off size={14} /> : <Link2 size={14} />}
        active={individual}
        onChange={onIndividualChange}
        label={individual ? `Link ${label.toLowerCase()}` : `Split ${label.toLowerCase()}`}
      />
    </div>
  );
}

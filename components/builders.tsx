"use client";

/**
 * Repeatable, reorderable inputs: screen sections, the hierarchy list
 * and project color tokens. Reordering is done with explicit up/down
 * buttons rather than drag-and-drop — it is keyboard operable, works on
 * touch, and is faster for a five-item list.
 */

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { emptySection, newId } from "@/lib/prompt/defaults";
import type { ColorToken, HierarchyItem, SectionSpec } from "@/lib/prompt/types";
import { Button } from "./ui";

export function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Accepts the forms a design system actually uses — hex, rgb/rgba,
 * hsl/hsla, a CSS variable, or a plain keyword. Anything else is flagged
 * rather than silently written into a prompt as if it were a color.
 */
const COLOR_VALUE =
  /^(#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|hsl)a?\([^)]+\)|var\(--[\w-]+\)|[a-z]+)$/i;

export function isValidColorValue(value: string): boolean {
  const text = value.trim();
  return text === "" || COLOR_VALUE.test(text);
}

const ROW_INPUT =
  "w-full rounded border border-fpb-line-strong bg-fpb-panel px-2 py-1.5 text-[13px] text-fpb-ink placeholder:text-fpb-faint transition-colors hover:border-fpb-faint";

function RowControls({
  index,
  count,
  label,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className="w-8 px-0"
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp aria-hidden className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-8 px-0"
        aria-label={`Move ${label} down`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown aria-hidden className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="w-8 px-0 hover:text-fpb-danger"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        <Trash2 aria-hidden className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function SectionBuilder({
  sections,
  onChange,
}: {
  sections: SectionSpec[];
  onChange: (sections: SectionSpec[]) => void;
}) {
  const update = (index: number, patch: Partial<SectionSpec>) => {
    onChange(sections.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[12px] font-medium text-fpb-ink">Sections</p>
        <p className="text-[12px] text-fpb-faint">Top to bottom, in the order they appear</p>
      </div>

      {sections.map((section, index) => (
        <div key={section.id} className="rounded border border-fpb-line bg-fpb-inset/60 p-2.5">
          <div className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-[12px] tabular-nums text-fpb-faint">{index + 1}</span>
            <input
              value={section.name}
              onChange={(event) => update(index, { name: event.target.value })}
              placeholder="Section name"
              aria-label={`Section ${index + 1} name`}
              className={`${ROW_INPUT} font-medium`}
            />
            <RowControls
              index={index}
              count={sections.length}
              label={`section ${index + 1}`}
              onMove={(direction) => onChange(move(sections, index, direction))}
              onRemove={() => onChange(sections.filter((_, i) => i !== index))}
            />
          </div>

          <div className="mt-2 flex flex-col gap-2 pl-7">
            <input
              value={section.purpose}
              onChange={(event) => update(index, { purpose: event.target.value })}
              placeholder="What is this section for?"
              aria-label={`Section ${index + 1} purpose`}
              className={ROW_INPUT}
            />
            <textarea
              value={section.content}
              onChange={(event) => update(index, { content: event.target.value })}
              placeholder="Important content in this section"
              aria-label={`Section ${index + 1} content`}
              rows={2}
              className={`${ROW_INPUT} resize-y`}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={section.primaryAction}
                onChange={(event) => update(index, { primaryAction: event.target.value })}
                placeholder="Action in this section (optional)"
                aria-label={`Section ${index + 1} action`}
                className={ROW_INPUT}
              />
              <input
                value={section.notes}
                onChange={(event) => update(index, { notes: event.target.value })}
                placeholder="Notes (optional)"
                aria-label={`Section ${index + 1} notes`}
                className={ROW_INPUT}
              />
            </div>
          </div>
        </div>
      ))}

      <div>
        <Button size="sm" onClick={() => onChange([...sections, emptySection()])}>
          <Plus aria-hidden className="h-3.5 w-3.5" />
          Add section
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function HierarchyBuilder({
  items,
  onChange,
}: {
  items: HierarchyItem[];
  onChange: (items: HierarchyItem[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <span className="w-5 shrink-0 text-center text-[12px] tabular-nums text-fpb-faint">{index + 1}</span>
          <input
            value={item.text}
            onChange={(event) =>
              onChange(items.map((entry, i) => (i === index ? { ...entry, text: event.target.value } : entry)))
            }
            placeholder={index === 0 ? "What should they notice first?" : `Then… (${index + 1})`}
            aria-label={`Hierarchy position ${index + 1}`}
            className={ROW_INPUT}
          />
          <RowControls
            index={index}
            count={items.length}
            label={`position ${index + 1}`}
            onMove={(direction) => onChange(move(items, index, direction))}
            onRemove={() => onChange(items.filter((_, i) => i !== index))}
          />
        </div>
      ))}
      <div>
        <Button size="sm" onClick={() => onChange([...items, { id: newId("h"), text: "" }])}>
          <Plus aria-hidden className="h-3.5 w-3.5" />
          Add level
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function ColorTokenBuilder({
  colors,
  onChange,
}: {
  colors: ColorToken[];
  onChange: (colors: ColorToken[]) => void;
}) {
  const update = (index: number, patch: Partial<ColorToken>) => {
    onChange(colors.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] font-medium text-fpb-ink">Color palette</p>
      <div className="hidden gap-2 px-1 text-[11px] uppercase tracking-[0.04em] text-fpb-faint sm:flex">
        <span className="w-[28%]">Token</span>
        <span className="w-[24%]">Value</span>
        <span className="flex-1">Purpose</span>
        <span className="w-[104px]" />
      </div>
      {colors.map((token, index) => {
        const invalid = !isValidColorValue(token.value);
        return (
        <div key={token.id} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex items-center gap-2 sm:w-[28%]">
            <span
              aria-hidden
              className="h-5 w-5 shrink-0 rounded border border-fpb-line-strong"
              style={{ background: invalid || !token.value.trim() ? "transparent" : token.value.trim() }}
            />
            <input
              value={token.name}
              onChange={(event) => update(index, { name: event.target.value })}
              placeholder="token"
              aria-label={`Color ${index + 1} token name`}
              className={ROW_INPUT}
            />
          </div>
          <div className="sm:w-[24%]">
            <input
              value={token.value}
              onChange={(event) => update(index, { value: event.target.value })}
              placeholder="#000000"
              aria-label={`Color ${index + 1} value`}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${token.id}-invalid` : undefined}
              className={`${ROW_INPUT} ${invalid ? "border-fpb-danger" : ""}`}
            />
            {invalid ? (
              <p id={`${token.id}-invalid`} className="mt-1 text-[11.5px] leading-[1.4] text-fpb-danger">
                Not a color value. Use a hex, rgb(), hsl(), var() or a CSS keyword.
              </p>
            ) : null}
          </div>
          <input
            value={token.purpose}
            onChange={(event) => update(index, { purpose: event.target.value })}
            placeholder="what it is used for"
            aria-label={`Color ${index + 1} purpose`}
            className={`${ROW_INPUT} sm:flex-1`}
          />
          <RowControls
            index={index}
            count={colors.length}
            label={`color ${index + 1}`}
            onMove={(direction) => onChange(move(colors, index, direction))}
            onRemove={() => onChange(colors.filter((_, i) => i !== index))}
          />
        </div>
        );
      })}
      <div>
        <Button
          size="sm"
          onClick={() => onChange([...colors, { id: newId("col"), name: "", value: "", purpose: "" }])}
        >
          <Plus aria-hidden className="h-3.5 w-3.5" />
          Add color
        </Button>
      </div>
    </div>
  );
}

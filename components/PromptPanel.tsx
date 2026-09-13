"use client";

/**
 * The live prompt preview — the thing the user actually came for.
 *
 * The generated prompt is plain text (that is what gets copied); the
 * rendering here only adds typographic structure on top of it, by
 * recognising the ALL-CAPS section headings the compilers emit.
 */

import { AlertTriangle, Check, Copy } from "lucide-react";
import { useMemo } from "react";
import { CONTEXT_MODES, DETAIL_LEVELS, MODES } from "@/lib/prompt/options";
import type { Conflict } from "@/lib/prompt/conflicts";
import type { ContextMode, DetailLevel, PromptMode, Readiness } from "@/lib/prompt/types";
import { Button, InlineSelect } from "./ui";

const HEADING = /^[A-Z][A-Z0-9 ,'’&/—–-]{2,60}$/;

const READINESS_STYLE: Record<Readiness["level"], string> = {
  "needs-context": "border-fpb-line-strong bg-fpb-panel text-fpb-warn",
  good: "border-fpb-line-strong bg-fpb-panel text-fpb-muted",
  strong: "border-fpb-line-strong bg-fpb-panel text-fpb-positive",
};

export function ReadinessPill({ readiness }: { readiness: Readiness }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-medium ${READINESS_STYLE[readiness.level]}`}
      title="How much design information this prompt actually carries"
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          readiness.level === "strong"
            ? "bg-fpb-positive"
            : readiness.level === "good"
              ? "bg-fpb-faint"
              : "bg-fpb-warn"
        }`}
      />
      {readiness.label}
    </span>
  );
}

export function PromptPanel({
  prompt,
  readiness,
  copied,
  onCopy,
  mode,
  contextMode,
  detail,
  onContextModeChange,
  onDetailChange,
  conflicts,
  projectName,
}: {
  prompt: string;
  readiness: Readiness;
  copied: boolean;
  onCopy: () => void;
  mode: PromptMode;
  contextMode: ContextMode;
  detail: DetailLevel;
  onContextModeChange: (mode: ContextMode) => void;
  onDetailChange: (detail: DetailLevel) => void;
  conflicts: Conflict[];
  projectName: string;
}) {
  const blocks = useMemo(() => prompt.split("\n"), [prompt]);
  const words = useMemo(() => (prompt.trim() ? prompt.trim().split(/\s+/).length : 0), [prompt]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-fpb-panel">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-fpb-line px-4 py-3 md:px-6">
        <h2 className="text-[13px] font-semibold tracking-[-0.005em] text-fpb-ink">Figma prompt</h2>
        <ReadinessPill readiness={readiness} />
        <span className="text-[12px] tabular-nums text-fpb-faint">
          {words.toLocaleString()} words · {prompt.length.toLocaleString()} characters
        </span>
        <div className="ml-auto">
          <Button variant="primary" onClick={onCopy} disabled={!prompt.trim()} className="min-w-[120px]">
            {copied ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-fpb-line px-4 py-1.5 text-[12px] text-fpb-muted md:px-6">
        <span className="font-medium text-fpb-ink">{MODES.find((entry) => entry.id === mode)?.label}</span>
        <span aria-hidden className="text-fpb-faint">·</span>
        <InlineSelect
          label="Project context"
          value={contextMode}
          options={CONTEXT_MODES}
          onChange={onContextModeChange}
        />
        <span aria-hidden className="text-fpb-faint">·</span>
        <InlineSelect label="Prompt detail" value={detail} options={DETAIL_LEVELS} onChange={onDetailChange} />
      </div>

      {conflicts.length > 0 ? (
        <div className="border-b border-fpb-line bg-[#fdf6ec] px-4 py-3 md:px-6">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-fpb-warn">
            <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
            {conflicts.length === 1 ? "Conflict with this project" : `${conflicts.length} conflicts with this project`}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {conflicts.map((conflict) => (
              <li key={conflict.id} className="text-[12.5px] leading-[1.5] text-fpb-ink">
                <span className="font-medium">{conflict.title}.</span>{" "}
                <span className="text-fpb-muted">{conflict.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {readiness.suggestions.length > 0 ? (
        <div className="border-b border-fpb-line bg-fpb-inset/70 px-4 py-2.5 md:px-6">
          <p className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-fpb-faint">To strengthen this prompt</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {readiness.suggestions.map((suggestion) => (
              <li key={suggestion} className="text-[12.5px] leading-[1.5] text-fpb-muted">
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6">
        {prompt.trim() ? (
          <div className="fpb-prompt max-w-[76ch] text-[13px] leading-[1.75] text-fpb-ink">
            {blocks.map((line, index) => {
              if (line.trim() === "") return <div key={index} className="h-3.5" aria-hidden />;
              if (HEADING.test(line.trim())) {
                return (
                  <h3
                    key={index}
                    className="mt-5 border-b border-fpb-line pb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-fpb-accent first:mt-0"
                  >
                    {line}
                  </h3>
                );
              }
              return <p key={index}>{line}</p>;
            })}
          </div>
        ) : (
          <div className="max-w-[52ch]">
            <p className="text-[13px] leading-[1.6] text-fpb-muted">
              Nothing to generate yet{projectName ? ` for ${projectName}` : ""}.
            </p>
            <p className="mt-2 text-[13px] leading-[1.6] text-fpb-faint">
              Fill in the brief on the left and the prompt appears here as you type — there is nothing to submit. A
              prompt built from project rules alone would not describe your screen, so Copy and Save stay disabled
              until the brief says something.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

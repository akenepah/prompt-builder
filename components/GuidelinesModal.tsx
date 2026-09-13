"use client";

/**
 * The persistent half of the product: a Project Profile rendered as a
 * Guidelines.md for the Figma Make project, with the actions needed to
 * get it there — copy, download, and mark it installed so task prompts
 * stop repeating what Figma already knows.
 */

import { Check, Copy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { GUIDELINES_FILENAME, compileGuidelines } from "@/lib/prompt/guidelines";
import type { ProjectProfile } from "@/lib/prompt/types";
import { Button, Modal, Toggle } from "./ui";

const MD_HEADING = /^(#{1,3})\s+(.*)$/;

/** Render **bold** inline so the preview reads as the document, not as source. */
function inline(text: string) {
  return text.split("**").map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

export function GuidelinesModal({
  project,
  guardrails,
  onSetInstalled,
  onClose,
  onCopy,
}: {
  project: ProjectProfile;
  guardrails: boolean;
  onSetInstalled: (installed: boolean) => void;
  onClose: () => void;
  onCopy: (text: string) => Promise<boolean>;
}) {
  const markdown = useMemo(() => compileGuidelines(project, guardrails), [project, guardrails]);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;

  const handleCopy = async () => {
    const ok = await onCopy(markdown);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = GUIDELINES_FILENAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1600);
  };

  return (
    <Modal
      wide
      title={`${GUIDELINES_FILENAME} — ${project.name}`}
      description="Paste this into your Figma Make project's guidelines so every prompt inherits it."
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-fpb-line px-5 py-3">
        <Button variant="primary" size="sm" onClick={handleCopy} className="min-w-[132px]">
          {copied ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy guidelines"}
        </Button>
        <Button size="sm" onClick={handleDownload} className="min-w-[150px]">
          <Download aria-hidden className="h-3.5 w-3.5" />
          {downloaded ? "Downloaded" : `Download ${GUIDELINES_FILENAME}`}
        </Button>
        <span className="ml-auto text-[12px] tabular-nums text-fpb-faint">
          {words.toLocaleString()} words · {markdown.length.toLocaleString()} characters
        </span>
      </div>

      <div className="max-h-[52vh] overflow-y-auto px-5 py-4">
        <div className="fpb-prompt max-w-[80ch] text-[12.5px] leading-[1.7] text-fpb-ink">
          {markdown.split("\n").map((line, index) => {
            if (line.trim() === "") return <div key={index} className="h-3" aria-hidden />;
            const heading = MD_HEADING.exec(line);
            if (heading) {
              const size = heading[1].length;
              return (
                <p
                  key={index}
                  className={
                    size === 1
                      ? "mb-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-fpb-ink"
                      : size === 2
                        ? "mt-4 border-b border-fpb-line pb-1 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-fpb-accent"
                        : "mt-3 text-[12px] font-semibold text-fpb-muted"
                  }
                >
                  {inline(heading[2])}
                </p>
              );
            }
            return <p key={index}>{inline(line)}</p>;
          })}
        </div>
      </div>

      <footer className="border-t border-fpb-line px-5 py-3">
        <Toggle
          label="Guidelines installed in Figma"
          hint="Turn this on once the file is in your Figma Make project. Task prompts then point at it instead of repeating the design system — which is what makes them dramatically shorter."
          checked={project.guidelinesInstalled}
          onChange={onSetInstalled}
        />
      </footer>
    </Modal>
  );
}

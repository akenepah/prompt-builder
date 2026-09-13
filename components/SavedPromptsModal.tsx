"use client";

/**
 * Saved briefs. A saved entry keeps the structured brief as well as the
 * generated text, so opening one drops you back into the form rather
 * than into a dead copy of the output.
 */

import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { MODES } from "@/lib/prompt/options";
import type { SavedPrompt } from "@/lib/prompt/types";
import { Button, Modal } from "./ui";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function SavedPromptsModal({
  prompts,
  onOpen,
  onChange,
  onClose,
}: {
  prompts: SavedPrompt[];
  onOpen: (prompt: SavedPrompt) => void;
  onChange: (prompts: SavedPrompt[]) => void;
  onClose: () => void;
}) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const commitRename = (prompt: SavedPrompt) => {
    const title = renameValue.trim() || prompt.title;
    onChange(prompts.map((entry) => (entry.id === prompt.id ? { ...entry, title, updatedAt: Date.now() } : entry)));
    setRenamingId(null);
  };

  return (
    <Modal
      wide
      title="Saved prompts"
      description="Stored in this browser. Open one to keep editing its brief."
      onClose={onClose}
    >
      <div className="max-h-[65vh] overflow-y-auto p-3">
        {prompts.length === 0 ? (
          <p className="px-2 py-8 text-center text-[13px] text-fpb-faint">
            Nothing saved yet. Use Save in the header to keep a brief for later.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {[...prompts]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((prompt) => (
                <li key={prompt.id} className="flex flex-wrap items-center gap-2 rounded border border-fpb-line px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    {renamingId === prompt.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        aria-label="Prompt title"
                        onChange={(event) => setRenameValue(event.target.value)}
                        onBlur={() => commitRename(prompt)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitRename(prompt);
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            setRenamingId(null);
                          }
                        }}
                        className="w-full rounded border border-fpb-line-strong bg-fpb-panel px-2 py-1 text-[13px] text-fpb-ink"
                      />
                    ) : (
                      <p className="truncate text-[13px] font-medium text-fpb-ink">{prompt.title}</p>
                    )}
                    <p className="mt-0.5 truncate text-[12px] text-fpb-faint">
                      {MODES.find((mode) => mode.id === prompt.mode)?.label ?? prompt.mode} · {prompt.projectName} ·{" "}
                      {formatDate(prompt.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        setRenamingId(prompt.id);
                        setRenameValue(prompt.title);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      aria-label={`Duplicate ${prompt.title}`}
                      onClick={() =>
                        onChange([
                          ...prompts,
                          {
                            ...prompt,
                            id: `saved_${Math.random().toString(36).slice(2, 10)}`,
                            title: `${prompt.title} copy`,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                          },
                        ])
                      }
                    >
                      <Copy aria-hidden className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      aria-label={`Delete ${prompt.title}`}
                      onClick={() => onChange(prompts.filter((entry) => entry.id !== prompt.id))}
                    >
                      <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => onOpen(prompt)}>
                      Open
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

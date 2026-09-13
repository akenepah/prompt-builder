/**
 * Conflict detection between the selected Project Profile and the brief.
 *
 * Two things go wrong in practice and both produce a confident, wrong
 * prompt: writing a brief for one product while a different profile is
 * selected, and asking for something the profile forbids. Neither is
 * detectable from field completeness, so readiness alone cannot catch
 * them — a conflicted brief must never read as "Strong".
 *
 * Precision matters more than recall here. A warning that fires on
 * nothing is ignored; a warning that fires wrongly is worse than none.
 */

import type { Draft, ProjectProfile, PromptMode } from "./types";
import { projectDraft } from "./prompts";

export type ConflictSeverity = "critical" | "warning";

export interface Conflict {
  id: string;
  severity: ConflictSeverity;
  title: string;
  detail: string;
}

/** Every piece of free text the user typed for the active mode. */
export function briefText(draft: Draft, mode: PromptMode = draft.mode): string {
  const current = projectDraft(draft);
  const parts: string[] = [];
  const push = (value: unknown) => {
    if (typeof value === "string") parts.push(value);
  };

  if (mode === "new-screen") {
    const brief = current.newScreen;
    Object.values(brief).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => {
          if (typeof entry === "string") push(entry);
          else if (entry && typeof entry === "object") Object.values(entry).forEach(push);
        });
      } else push(value);
    });
  } else if (mode === "reference") {
    const brief = current.reference;
    Object.values(brief).forEach((value) => {
      if (Array.isArray(value)) value.forEach((entry) => (typeof entry === "string" ? push(entry) : Object.values(entry).forEach(push)));
      else push(value);
    });
  } else if (mode === "refine") {
    Object.values(current.refine).forEach((value) => {
      if (Array.isArray(value)) value.forEach(push);
      else push(value);
    });
  } else {
    Object.values(current.qa).forEach((value) => {
      if (Array.isArray(value)) value.forEach(push);
      else push(value);
    });
  }

  return parts.filter(Boolean).join("\n");
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle.trim()) return 0;
  const escaped = needle.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (haystack.match(new RegExp(`\\b${escaped}\\b`, "gi")) ?? []).length;
}

/**
 * Design materials a profile commonly rules out, paired with the words a
 * brief uses to ask for them. Keyed by the term as it appears in a "do
 * not" rule; matched loosely on both sides.
 */
const MATERIAL_TERMS: Array<{ id: string; rule: RegExp; brief: RegExp; label: string }> = [
  { id: "photography", rule: /\bphotograph(y|s|ic)?\b|\bphotos?\b/i, brief: /\bphotograph(y|s|ic)?\b|\bphotos?\b/i, label: "photography" },
  { id: "illustration", rule: /\billustrations?\b|\billustrated\b/i, brief: /\billustrations?\b|\billustrated\b/i, label: "illustration" },
  { id: "gradient", rule: /\bgradients?\b/i, brief: /\bgradients?\b/i, label: "gradients" },
  { id: "glassmorphism", rule: /\bglassmorphism\b|\bfrosted glass\b/i, brief: /\bglassmorphism\b|\bfrosted glass\b/i, label: "glassmorphism" },
  { id: "cards", rule: /\bcards?\b/i, brief: /\bcards?\b/i, label: "cards" },
  { id: "tiles", rule: /\b(stat |metric )?tiles?\b/i, brief: /\b(stat |metric )?tiles?\b/i, label: "stat tiles" },
  { id: "badges", rule: /\bbadges?\b/i, brief: /\bbadges?\b/i, label: "badges" },
  { id: "pills", rule: /\bpills?\b/i, brief: /\bpills?\b/i, label: "pill shapes" },
  { id: "shadows", rule: /\b(drop )?shadows?\b/i, brief: /\b(drop )?shadows?\b/i, label: "shadows" },
  { id: "animation", rule: /\banimations?\b|\banimated\b|\bmotion\b/i, brief: /\banimations?\b|\banimated\b|\bmotion\b/i, label: "animation" },
  { id: "carousel", rule: /\bcarousels?\b|\bsliders?\b/i, brief: /\bcarousels?\b|\bsliders?\b/i, label: "carousels" },
  { id: "modal", rule: /\bmodals?\b|\bdialogs?\b/i, brief: /\bmodals?\b|\bdialogs?\b/i, label: "modals" },
];

/** A line that forbids something: "No photography", "Never use gradients", "Avoid cards". */
const PROHIBITION = /^\s*(no|never|avoid|do not|don't|dont)\b/i;

/**
 * The brief is ruling the thing out too — "no photography", "not as
 * tiles", "Do not open with a row of stat tiles". Negation is scoped to
 * the clause containing the mention rather than a fixed character
 * window, because the distance between "do not" and its object varies.
 */
const CLAUSE_BOUNDARY = /[.!?;\n]/g;
const NEGATION = /\b(no|not|never|avoid|without|non|zero|instead of|rather than)\b/i;

function clauseBefore(text: string, index: number): string {
  const head = text.slice(0, index);
  let start = 0;
  for (const match of head.matchAll(CLAUSE_BOUNDARY)) {
    start = (match.index ?? 0) + 1;
  }
  return head.slice(start);
}

function asksFor(text: string, term: RegExp): boolean {
  const global = new RegExp(term.source, `${term.flags.replace("g", "")}g`);
  for (const match of text.matchAll(global)) {
    if (!NEGATION.test(clauseBefore(text, match.index ?? 0))) return true;
  }
  return false;
}

/**
 * Lines in the profile that forbid something — its explicit "do not"
 * rules, plus prohibitions written into the imagery and permanent-rule
 * fields, which is where "no photography" usually lives.
 */
function prohibitionLines(project: ProjectProfile): string[] {
  const sources = [project.doNotRules, project.permanentRules, project.imagery, project.icons, project.shadows];
  return sources
    .flatMap((source) => (source ?? "").split(/\r?\n|(?<=\.)\s+/))
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && PROHIBITION.test(line));
}

export function detectConflicts(
  draft: Draft,
  project: ProjectProfile | null,
  allProjects: ProjectProfile[],
): Conflict[] {
  if (!project) return [];
  const text = briefText(draft);
  if (!text.trim()) return [];

  const conflicts: Conflict[] = [];

  /* 1. The brief is written for a different project in this workspace. */
  for (const other of allProjects) {
    if (other.id === project.id) continue;
    const name = other.name.trim();
    if (name.length < 4) continue;
    const hits = countOccurrences(text, name);
    const ownHits = countOccurrences(text, project.name.trim());
    if (hits >= 2 && hits > ownHits) {
      conflicts.push({
        id: `foreign-project-${other.id}`,
        severity: "critical",
        title: `This brief looks like it belongs to “${other.name}”`,
        detail: `“${other.name}” appears ${hits} times in this brief, but the selected project is “${project.name}”. The generated prompt will carry ${project.name}'s design system. Switch project, or remove the references.`,
      });
    }
  }

  /* 2. The brief asks for something the profile forbids. */
  const lines = prohibitionLines(project);
  for (const term of MATERIAL_TERMS) {
    const rule = lines.find((line) => term.rule.test(line));
    if (!rule) continue;
    if (!asksFor(text, term.brief)) continue;
    conflicts.push({
      id: `rule-${term.id}`,
      severity: "critical",
      title: `The brief asks for ${term.label}, which ${project.name} rules out`,
      detail: `Project rule: “${rule.replace(/\s+/g, " ").trim()}”. Either drop it from the brief or change the rule — otherwise the prompt contradicts itself.`,
    });
  }

  return conflicts;
}

export function hasCriticalConflict(conflicts: Conflict[]): boolean {
  return conflicts.some((conflict) => conflict.severity === "critical");
}

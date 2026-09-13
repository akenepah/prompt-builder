/**
 * Shared writing utilities and the reusable blocks that appear across
 * more than one prompt mode (design system, guardrails, final review,
 * the container-expansion rule).
 *
 * Rules of the house:
 *  - never emit a heading with an empty or meaningless body
 *  - never emit a raw form value where a sentence is clearer
 *  - concrete instructions beat adjectives ("modern", "clean", "premium")
 */

import type { Density, ProjectProfile } from "../types";

export interface PromptSection {
  heading: string;
  body: string;
}

/* ------------------------------------------------------------------ */
/* text helpers                                                        */
/* ------------------------------------------------------------------ */

export function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

export function filled(value: string | undefined | null): boolean {
  return clean(value).length > 0;
}

/** Join the truthy parts with single newlines. */
export function lines(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0).join("\n");
}

/** Join the truthy parts with a blank line between them. */
export function paragraphs(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0).join("\n\n");
}

export function bullets(items: string[]): string {
  return items
    .map((item) => clean(item))
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

export function numbered(items: string[], start = 1): string {
  return items
    .map((item) => clean(item))
    .filter(Boolean)
    .map((item, index) => `${index + start}. ${item}`)
    .join("\n");
}

/**
 * Split a freeform textarea into discrete items. Users type lists either
 * one-per-line or comma separated; both should produce clean bullets.
 */
export function toItems(value: string | undefined | null): string[] {
  const text = clean(value);
  if (!text) return [];
  const byLine = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]\s+|\d{1,2}[.)]\s+)/, "").trim())
    .filter(Boolean);
  if (byLine.length > 1) return byLine;
  const single = byLine[0] ?? "";
  if (single.includes(",") && single.length < 220 && !/[.;:]/.test(single)) {
    return single
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return byLine;
}

/** "a", "a and b", "a, b and c" */
export function sentenceList(items: string[]): string {
  const list = items.map(clean).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** Lowercase the first letter so a value can be dropped mid-sentence. */
export function lowerFirst(value: string): string {
  const text = clean(value);
  if (!text) return "";
  if (/^[A-Z]{2,}/.test(text)) return text; // keep acronyms
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Ensure a fragment reads as a sentence when it is dropped into prose. */
export function asSentence(value: string): string {
  const text = clean(value);
  if (!text) return "";
  return /[.!?:]$/.test(text) ? text : `${text}.`;
}

const ORDINALS = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
];

export function ordinal(index: number): string {
  return ORDINALS[index] ?? `${index + 1}th`;
}

export function section(heading: string, body: string): PromptSection | null {
  const text = clean(body);
  if (!text) return null;
  return { heading, body: text };
}

export function renderSections(sections: Array<PromptSection | null>): string {
  return sections
    .filter((entry): entry is PromptSection => Boolean(entry && clean(entry.body)))
    .map((entry) => `${entry.heading}\n${entry.body}`)
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* shared prompt blocks                                                */
/* ------------------------------------------------------------------ */

export const ROLE_LINE =
  "You are acting as a senior product designer and UX architect, not a UI decorator. Make deliberate decisions about what matters on this screen, give that thing real visual priority, and let everything else recede.";

export const EXPANSION_RULE =
  "If more room is needed, expand the relevant parent frame or container. Do not shrink typography, compress the spacing scale, clip content, break component proportions, or force awkward text wrapping to make something fit. Readable typography and the established spacing scale take priority over a fixed frame height.";

export const CONTENT_HONESTY_RULE =
  "Use only the content provided. Do not invent statistics, metrics, testimonials, customer logos, awards, pricing or product features, and never use lorem ipsum. Where exact copy is not specified, write short, plausible, specific copy in the product's voice — no filler.";

export function projectContextLine(project: ProjectProfile | null): string {
  if (!project) return "";
  return lines(
    filled(project.productDescription) && `Product: ${asSentence(project.productDescription)}`,
    filled(project.primaryUsers) && `Who uses it: ${asSentence(project.primaryUsers)}`,
    filled(project.brandDirection) && `Experience direction: ${asSentence(project.brandDirection)}`,
  );
}

/**
 * The project's persistent design rules. Written once per project,
 * carried into every prompt, and stated as non-negotiable so Figma does
 * not quietly substitute its own defaults.
 */
export function designSystemBody(project: ProjectProfile | null): string {
  if (!project) return "";

  const type = lines(
    filled(project.headingTypeface) && `Headings: ${project.headingTypeface}`,
    filled(project.bodyTypeface) && `Body and UI: ${project.bodyTypeface}`,
  );

  const colors = project.colors
    .filter((token) => filled(token.name) || filled(token.value))
    .map((token) => {
      const head = [clean(token.name), clean(token.value)].filter(Boolean).join(" ");
      return filled(token.purpose) ? `${head} — ${lowerFirst(token.purpose)}` : head;
    });

  const layout = lines(
    filled(project.grid.columns) && `Columns: ${project.grid.columns}`,
    filled(project.grid.maxWidth) && `Content max width: ${project.grid.maxWidth}`,
    filled(project.grid.gutters) && `Gutters: ${project.grid.gutters}`,
    filled(project.grid.margins) && `Outer margins: ${project.grid.margins}`,
  );

  return paragraphs(
    type && `Typography\n${type}`,
    colors.length > 0 &&
      `Color\n${bullets(colors)}\nUse these tokens only. Do not introduce new hues, and do not use color to create hierarchy that typography and spacing should be creating.`,
    filled(project.spacingScale) &&
      `Spacing scale\nUse only these values: ${project.spacingScale}. Every margin, padding and gap must come from this scale — no one-off values.`,
    layout && `Grid and layout\n${layout}`,
    filled(project.radius) && `Corner radius\n${asSentence(project.radius)}`,
    filled(project.borders) && `Borders\n${asSentence(project.borders)}`,
    filled(project.shadows) && `Elevation\n${asSentence(project.shadows)}`,
    filled(project.icons) && `Icons\n${asSentence(project.icons)}`,
    filled(project.buttons) && `Buttons and actions\n${asSentence(project.buttons)}`,
    filled(project.imagery) && `Imagery\n${asSentence(project.imagery)}`,
    filled(project.permanentRules) && `Standing rules\n${bullets(toItems(project.permanentRules))}`,
    "These rules are not suggestions. If anything in this brief appears to conflict with them, the design system wins.",
  );
}

export function accessibilityBody(project: ProjectProfile | null, extra?: string): string {
  const projectRules = project ? toItems(project.accessibility) : [];
  const base = [
    "Body text meets at least 4.5:1 contrast against its background; large text and meaningful icons at least 3:1.",
    "Every interactive element has a visible, non-color-only focus state.",
    "Interactive targets are at least 44×44px on touch, with adequate spacing between adjacent targets.",
    "Never use color alone to carry meaning — pair it with text, weight, an icon or position.",
    "Headings follow a sensible order and labels sit with their inputs, so the screen reads correctly top to bottom.",
  ];
  return paragraphs(bullets([...projectRules, ...base]), filled(extra) ? asSentence(clean(extra)) : "");
}

export function responsiveBody(project: ProjectProfile | null, extra?: string): string {
  return lines(
    project && filled(project.breakpoints) && `Breakpoints: ${asSentence(project.breakpoints)}`,
    filled(extra) ? clean(extra) : "",
    "The information hierarchy must survive every breakpoint. Narrow layouts reflow and stack — they do not reorder priorities, hide primary actions behind menus, or shrink type below readable sizes.",
  );
}

/* ------------------------------------------------------------------ */
/* anti-AI-UI guardrails                                               */
/* ------------------------------------------------------------------ */

const GUARDRAIL_AVOID = [
  "Cards and containers used as default packaging. A box is only justified when it groups things that genuinely belong together and are separated from what surrounds them.",
  "Arbitrary rounded rectangles, pills and badges used as decoration rather than to communicate state.",
  "Gradients, glassmorphism, glows and heavy drop shadows.",
  "Generic SaaS-dashboard styling: a wall of equal-weight stat tiles, decorative charts with no data behind them, floating widgets with no owner.",
  "Bento grids adopted for their own sake, where the grid is not carrying a real relationship between the items.",
  "Oversized marketing headlines that push real content below the fold and destroy information density.",
  "Random icons beside every label, and icons that repeat the word next to them.",
  "Lorem ipsum, invented statistics, invented logos and invented product features.",
];

const GUARDRAIL_PREFER = [
  "Type scale, weight and color contrast to create hierarchy.",
  "Spacing and alignment to create grouping — proximity before boxes.",
  "A single hairline divider where separation is genuinely needed.",
  "Intentional whitespace, used unevenly: more space around what matters, less inside what belongs together.",
];

export function guardrailsBody(project: ProjectProfile | null): string {
  const projectDoNots = project ? toItems(project.doNotRules) : [];
  return paragraphs(
    projectDoNots.length > 0 ? `Standing project rules that always apply:\n${bullets(projectDoNots)}` : "",
    `This design must not read as generic AI-generated UI. Avoid:\n${bullets(GUARDRAIL_AVOID)}`,
    `Before adding any container, shadow, badge or icon, try solving the problem with:\n${bullets(GUARDRAIL_PREFER)}\nOnly add a container when those have been tried and are genuinely insufficient.`,
  );
}

/* ------------------------------------------------------------------ */
/* density                                                             */
/* ------------------------------------------------------------------ */

const DENSITY_COPY: Record<Exclude<Density, "">, string> = {
  spacious:
    "Spacious. Use the upper end of the spacing scale between sections, give primary content generous breathing room, and accept a longer page rather than crowding. Whitespace is doing real work here — do not fill it.",
  balanced:
    "Balanced. Generous separation between major sections, tight and deliberate grouping within them, so the eye can find the seams of the page without scanning.",
  dense:
    "Dense but not cramped. Use the lower end of the spacing scale, favor compact rows and tables over cards, and keep more information above the fold. Density must not come from shrinking type — hold the body size and tighten spacing instead.",
};

export function densityLine(density: Density): string {
  if (!density) return "";
  return `Information density: ${DENSITY_COPY[density]}`;
}

/* ------------------------------------------------------------------ */
/* interaction states                                                  */
/* ------------------------------------------------------------------ */

const STATE_COPY: Record<string, string> = {
  Default: "Default — the resting state, legible and unambiguous without hover.",
  Hover: "Hover — a restrained change (background, border or underline). Do not move or resize the element.",
  Focus: "Focus — a clearly visible keyboard focus ring that is not conveyed by color alone and is never removed.",
  Active: "Active/pressed — an immediate, obvious response to the press.",
  Selected: "Selected — persistent, readable at a glance, and distinct from hover.",
  Disabled: "Disabled — visibly inert but still legible; never a grey blur, and never the only explanation for why an action is unavailable.",
  Loading: "Loading — preserve layout dimensions so nothing jumps when content arrives. Skeletons over spinners for content areas; in-place feedback for buttons.",
  Empty: "Empty — explain what belongs here and offer the single action that fills it. No decorative illustration, no dead end.",
  Error: "Error — say what went wrong and what to do next, next to the thing that failed. Never a bare red border.",
  Success: "Success — confirm what happened and what changed, then get out of the way.",
};

export function statesBody(states: string[], notes: string): string {
  const copy = states.map((state) => STATE_COPY[state] ?? state);
  return paragraphs(filled(notes) ? asSentence(clean(notes)) : "", copy.length > 0 ? `Design these states explicitly:\n${bullets(copy)}` : "");
}

/* ------------------------------------------------------------------ */
/* final design review                                                 */
/* ------------------------------------------------------------------ */

const REVIEW_QUESTIONS = [
  "Can someone understand what this screen is for within about five seconds?",
  "Is the primary action obvious without hunting?",
  "Does the visual hierarchy match the user's actual priorities, rather than giving everything equal weight?",
  "Are related items visually grouped, and unrelated items clearly separated?",
  "Is every container, card and divider earning its place, or is some of it packaging?",
  "Is anything competing with more important information for attention?",
  "Does any part of this look like stereotypical AI-generated UI?",
  "Does the result actually follow the project's type, color, spacing and grid rules?",
  "Does the responsive behavior preserve the hierarchy, or does it flatten it?",
  "Could anything be removed without hurting comprehension?",
];

export function finalReviewBody(): string {
  return lines(
    "Before you finish, review your own output against these questions:",
    numbered(REVIEW_QUESTIONS),
    "",
    "Where an answer exposes a problem, fix it rather than noting it. Where removing something improves the design, remove it.",
  );
}

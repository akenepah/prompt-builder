/**
 * DESIGN QA — inspect an existing screen, report what is wrong, fix it
 * without changing the design language.
 *
 * Each selected category expands into the specific things a design
 * reviewer would actually look for, because "check the spacing" produces
 * nothing useful on its own.
 */

import type { ProjectProfile, QABrief, QADepth } from "../types";
import {
  EXPANSION_RULE,
  asSentence,
  bullets,
  clean,
  designSystemBody,
  filled,
  lines,
  numbered,
  paragraphs,
  renderSections,
  section,
  toItems,
} from "./shared";

/** What each inspection category actually means, in checkable terms. */
export const QA_CATEGORIES: Record<string, string> = {
  Typography:
    "Typography — every text layer uses a defined type style; no one-off sizes, weights or line heights; line height is appropriate to size; line length stays within a readable measure; no unintended mixed typefaces.",
  Hierarchy:
    "Hierarchy — the most important element is the most prominent; nothing secondary is competing with it; the number of distinct emphasis levels is small and consistent across the screen.",
  Spacing:
    "Spacing — every gap, margin and padding value comes from the spacing scale; padding inside containers is symmetrical; gaps between sibling items are equal; space between groups exceeds space within a group.",
  Alignment:
    "Alignment — shared left edges sit on one axis; baselines align across columns; labels and values align consistently; nothing is off by one or two pixels.",
  Grid:
    "Grid — content spans whole columns; the content max width is respected; outer margins are consistent; any deliberate break from the grid looks deliberate.",
  "Auto Layout":
    "Auto Layout — frames use Auto Layout rather than absolute positioning; padding, gap, alignment and resizing (hug/fill/fixed) are set intentionally; nothing depends on a manually nudged position.",
  Clipping:
    "Clipping — no text or element is cut off by a fixed frame size or a clip-content setting; icons and avatars are not cropped by their frames.",
  Overflow:
    "Overflow — no content spills past its container or the screen edge; no horizontal scroll at any supported width.",
  Wrapping:
    "Wrapping — no awkward wraps, single-word orphans, or mid-word breaks; buttons and labels do not wrap into two lines unintentionally; longest-realistic content still fits.",
  "Responsive behavior":
    "Responsive behavior — the layout reflows correctly at each supported breakpoint; the hierarchy survives; nothing overlaps, clips or becomes unreachable at narrow widths.",
  "Component consistency":
    "Component consistency — controls of the same kind share height, padding, radius, icon size and label style; instances are not needlessly detached; identical patterns are not implemented two different ways.",
  Colors:
    "Colors — every fill and stroke uses a defined token; no stray hex values; color is not carrying meaning on its own; accent color is used sparingly enough to still mean something.",
  Accessibility:
    "Accessibility — body text meets 4.5:1 contrast and large text 3:1; focus states are visible; meaning is never conveyed by color alone; heading order is sensible; labels are associated with their controls.",
  States:
    "States — the states that matter are designed, not assumed: hover, focus, active, selected, disabled, loading, empty, error, success — wherever each applies.",
  "Touch targets":
    "Touch targets — interactive elements are at least 44×44px on touch, with enough space between adjacent targets to avoid mis-taps.",
};

const DEPTH_COPY: Record<QADepth, string> = {
  conservative:
    "Conservative pass. Fix only clear, objective defects — things that are measurably wrong or broken. Do not make judgment-call improvements; list those separately instead of applying them.",
  standard:
    "Standard pass. Fix objective defects and clear inconsistencies. Where a fix is a matter of taste rather than correctness, leave the design as it is and note it.",
  thorough:
    "Thorough pass. Fix objective defects, inconsistencies, and weak hierarchy or grouping decisions — but stay inside the existing design language. A thorough pass is still not a redesign.",
};

export function compileDesignQA(brief: QABrief, project: ProjectProfile | null): string {
  const frame = filled(brief.frameName) ? clean(brief.frameName) : "the selected frame";

  const task = paragraphs(
    "You are acting as a senior product designer performing a design QA review on an existing screen. Inspect first, then correct. Do not redesign.",
    `Screen: ${frame}`,
    "Work in two passes. First, inspect the screen against the checklist below and write a short, specific list of what is wrong — name the element and the actual problem, not a general impression. Second, correct the issues you found, in place, using the existing design language.",
  );

  const checklist =
    brief.categories.length > 0
      ? lines(
          "Inspect each of these:",
          bullets(brief.categories.map((category) => QA_CATEGORIES[category] ?? category)),
        )
      : "";

  const known = filled(brief.knownIssues)
    ? paragraphs(
        `Start with these known issues:\n${bullets(toItems(brief.knownIssues))}`,
        "Fix the cause of each one, then continue with the full inspection — the list above is not exhaustive.",
      )
    : "";

  const protect = paragraphs(
    filled(brief.unchanged) ? `These must not change:\n${bullets(toItems(brief.unchanged))}` : "",
    `Always:\n${bullets([
      "Preserve the existing design language: typefaces, type scale, color tokens, radii, borders, elevation and component style all stay as they are.",
      "Preserve the content. Do not rewrite copy, invent data or remove information to make the layout easier.",
      "Preserve the structure. Do not reorder, merge, add or remove sections.",
      "This is a correction pass, not a redesign. If a problem can only be solved by redesigning, describe it instead of doing it.",
    ])}`,
  );

  const overflow = brief.expandContainers
    ? EXPANSION_RULE
    : "";

  return renderSections([
    section("ROLE AND TASK", task),
    section("DEPTH", DEPTH_COPY[brief.depth]),
    section("INSPECT", checklist),
    section("KNOWN ISSUES", known),
    section("WHAT MUST NOT CHANGE", protect),
    section("IF SOMETHING DOES NOT FIT", overflow),
    section("MEASURE AGAINST THIS SYSTEM", designSystemBody(project)),
    section("ADDITIONAL NOTES", filled(brief.notes) ? asSentence(clean(brief.notes)) : ""),
    section(
      "REPORT",
      lines(
        "Finish with a short report in this shape:",
        numbered([
          "Fixed — what was wrong, and what you changed, one line each.",
          "Found but not fixed — anything outside the scope of a correction pass, with what you would propose.",
          "Verified — the checks that passed, in one line.",
        ]),
        "",
        "Be specific: name the element and the value. \"Tightened spacing\" is not a report; \"section gap was 28px, now 32px from the scale\" is.",
      ),
    ),
  ]);
}

/**
 * NEW SCREEN — compile a from-scratch screen prompt.
 *
 * The brief is small on purpose; most of the length in the output comes
 * from turning short answers into the instructions an experienced
 * designer would have written out longhand.
 */

import type { NewScreenBrief, ProjectProfile } from "../types";
import {
  CONTENT_HONESTY_RULE,
  EXPANSION_RULE,
  ROLE_LINE,
  accessibilityBody,
  asSentence,
  bullets,
  clean,
  densityLine,
  designSystemBody,
  filled,
  finalReviewBody,
  guardrailsBody,
  lines,
  lowerFirst,
  numbered,
  paragraphs,
  projectContextLine,
  renderSections,
  responsiveBody,
  section,
  statesBody,
  toItems,
} from "./shared";

/**
 * Structural expectations per screen type. These describe shape and
 * behavior only — they never invent product content.
 */
const SCREEN_TYPE_GUIDANCE: Record<string, string> = {
  "Landing page":
    "As a landing page, the top of the screen must establish what this is and who it is for before any feature detail. One conversion action, stated in the same words everywhere it appears. Proof and detail follow the claim; they do not open the page.",
  "Marketing page":
    "As a marketing page, every section must answer a question the reader is actually asking at that point in the page. Do not pad the page with sections that exist only to fill the scroll.",
  "Dashboard":
    "As a dashboard, the top of the screen answers 'is anything wrong, and what needs me' before it shows totals. Numbers need a comparison or a label to be meaningful — a bare figure in a box is not information. Prefer dense, aligned rows over a field of equal-weight tiles.",
  "Detail page":
    "As a detail page, identity and status come first, then the actions available on this object, then supporting detail. Keep the object's identity visible while the user scrolls through its detail.",
  "Directory / listing":
    "As a listing, scanning beats decoration. Align the values that get compared into columns, keep row height tight and consistent, and make filters visible and reversible. Show result count and the active filters at all times.",
  "Settings":
    "As a settings screen, group by the user's mental model rather than by data model, label every control with what it does rather than what it is called internally, and state what happens when something is changed — especially anything destructive.",
  "Form / input flow":
    "As an input flow, one column, one clear order, and visible progress if there is more than one step. Labels sit above their fields, help text sits with the field it helps, and errors appear next to what failed with a way to fix it.",
  "Onboarding":
    "As onboarding, each step asks for the least it can and explains why it is being asked. Never block the user on something that could be collected later.",
  "Mobile screen":
    "As a mobile screen, the primary action is reachable in the thumb zone, targets are at least 44px, and the screen holds a single job. Do not miniaturize a desktop layout.",
  "Empty / zero state":
    "As a zero state, explain what belongs here, why it is worth having, and offer exactly one action that fills it.",
  "Modal / dialog":
    "As a dialog, one decision, stated in the title, with the consequence visible before the confirming action. The dialog is sized to its content, not to a grid.",
};

export function compileNewScreen(
  brief: NewScreenBrief,
  project: ProjectProfile | null,
  guardrails: boolean,
): string {
  const screenLabel = filled(brief.screenName)
    ? clean(brief.screenName)
    : filled(brief.screenType)
      ? clean(brief.screenType)
      : "screen";

  const productName = project && filled(project.name) ? clean(project.name) : "";

  const task = paragraphs(
    ROLE_LINE,
    lines(
      `Design ${filled(brief.screenType) ? `the ${lowerFirst(clean(brief.screenType))}` : "the screen"} "${screenLabel}"${productName ? ` for ${productName}` : ""}.`,
      filled(brief.whatWeAreDesigning) && asSentence(clean(brief.whatWeAreDesigning)),
    ),
  );

  const job = paragraphs(
    filled(brief.primaryGoal) &&
      `The user comes to this screen to ${lowerFirst(clean(brief.primaryGoal))}. That job is the reason the screen exists — the layout, the hierarchy and the emphasis all serve it.`,
    filled(brief.secondaryGoals) &&
      `Also supported, but never at the expense of the job above:\n${bullets(toItems(brief.secondaryGoals))}`,
  );

  const uncertainty = paragraphs(
    filled(brief.userConcerns) &&
      `The user arrives with these questions and doubts:\n${bullets(toItems(brief.userConcerns))}\nThe design must answer them in place. Do not leave the user to hunt, guess or ask someone.`,
    filled(brief.trustFactors) &&
      `What has to feel clear and trustworthy: ${asSentence(lowerFirst(clean(brief.trustFactors)))}`,
  );

  const structure = buildStructure(brief);
  const hierarchy = buildHierarchy(brief);

  const content = paragraphs(
    filled(brief.requiredContent) ? `This content must appear:\n${bullets(toItems(brief.requiredContent))}` : "",
    filled(brief.primaryCta)
      ? `Primary action: "${clean(brief.primaryCta)}". It is the most prominent interactive element on the screen, it is visible without scrolling, and its label stays identical everywhere it appears.`
      : "",
    filled(brief.secondaryCta)
      ? `Secondary action: "${clean(brief.secondaryCta)}". Clearly subordinate to the primary action — different weight, not just a different color.`
      : "",
    CONTENT_HONESTY_RULE,
  );

  const layout = paragraphs(
    filled(brief.layoutNotes) ? asSentence(clean(brief.layoutNotes)) : "",
    densityLine(brief.density),
    "Set up real Auto Layout with consistent padding and gaps from the spacing scale, so the screen holds together when content length changes. Align to the grid — optical alignment only where the grid produces a visibly wrong result.",
    EXPANSION_RULE,
  );

  const visual = paragraphs(
    filled(brief.visualDirection) ? asSentence(clean(brief.visualDirection)) : "",
    filled(brief.referenceNotes) ? `Reference notes: ${asSentence(lowerFirst(clean(brief.referenceNotes)))}` : "",
    "Express that direction through typography, spacing, alignment and restraint — not through decoration, containers or effects.",
  );

  return renderSections([
    section("ROLE AND TASK", task),
    section("PRODUCT CONTEXT", projectContextLine(project)),
    section("PRIMARY USER", filled(brief.primaryUser) ? asSentence(clean(brief.primaryUser)) : project ? clean(project.primaryUsers) : ""),
    section("THE USER'S JOB", job),
    section("WHAT THE USER IS UNSURE ABOUT", uncertainty),
    section("SCREEN OBJECTIVE", buildObjective(brief)),
    section("SCREEN STRUCTURE", structure),
    section("INFORMATION HIERARCHY", hierarchy),
    section("CONTENT", content),
    section("LAYOUT", layout),
    section("DESIGN SYSTEM — NON-NEGOTIABLE", designSystemBody(project)),
    section("VISUAL DIRECTION", visual),
    section("COMPONENT AND INTERACTION BEHAVIOR", statesBody(brief.states, brief.interactionNotes)),
    section("RESPONSIVE BEHAVIOR", responsiveBody(project, lines(clean(brief.responsivePriorities), clean(brief.responsiveNotes)))),
    section("ACCESSIBILITY", accessibilityBody(project)),
    section("PRESERVE", filled(brief.mustPreserve) ? bullets(toItems(brief.mustPreserve)) : ""),
    section(
      "DO NOT",
      paragraphs(
        filled(brief.mustNotHappen) ? bullets(toItems(brief.mustNotHappen)) : "",
        filled(brief.screenRules) ? `Screen-specific rules:\n${bullets(toItems(brief.screenRules))}` : "",
        guardrails ? guardrailsBody(project) : project ? bullets(toItems(project.doNotRules)) : "",
      ),
    ),
    section("FINAL DESIGN REVIEW", finalReviewBody()),
  ]);
}

function buildObjective(brief: NewScreenBrief): string {
  const typeGuidance = SCREEN_TYPE_GUIDANCE[clean(brief.screenType)] ?? "";
  const first = brief.hierarchy.map((item) => clean(item.text)).filter(Boolean)[0] ?? "";

  return paragraphs(
    filled(brief.primaryGoal)
      ? `Within about five seconds of landing here, the user should understand where they are, what they can do, and how to ${lowerFirst(clean(brief.primaryGoal))}.`
      : "Within about five seconds of landing here, the user should understand where they are, what this screen is for, and what to do next.",
    first ? `The screen has succeeded when the first thing the eye lands on is this: ${first}. The next step must be obvious from there.` : "",
    typeGuidance,
  );
}

function buildStructure(brief: NewScreenBrief): string {
  const sections = brief.sections.filter((entry) => filled(entry.name) || filled(entry.purpose) || filled(entry.content));
  if (sections.length === 0) return "";

  const written = sections.map((entry, index) => {
    const title = filled(entry.name) ? clean(entry.name) : `Section ${index + 1}`;
    const detail = lines(
      filled(entry.purpose) && `   Purpose: ${asSentence(clean(entry.purpose))}`,
      filled(entry.content) && `   Content: ${clean(entry.content)}`,
      filled(entry.primaryAction) && `   Action: ${clean(entry.primaryAction)}`,
      filled(entry.notes) && `   Notes: ${asSentence(clean(entry.notes))}`,
    );
    return lines(`${index + 1}. ${title}`, detail);
  });

  return paragraphs(
    "Build these sections, in this order:",
    written.join("\n\n"),
    "Each section must earn its space. If two sections are doing the same job, merge them. Separate them with spacing and typography first; introduce a container or divider only where grouping genuinely needs it.",
  );
}

function buildHierarchy(brief: NewScreenBrief): string {
  const items = brief.hierarchy.map((item) => clean(item.text)).filter(Boolean);
  if (items.length === 0) return "";

  const ranked = numbered(items);
  const emphasis = [
    "Give the first item the strongest visual weight on the screen — through size, position and the space around it.",
    items.length > 1 ? "The second is clearly subordinate to it but still ahead of everything else." : "",
    items.length > 2 ? "From the third item down, each one steps down again in weight." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return paragraphs(
    "The user should notice things in this order:",
    ranked,
    emphasis,
    "Create that order with size, weight, contrast, position and surrounding space — in that priority. Do not give every section equal visual weight, and do not rely on color or a container to make something feel important. Anything not on this list is supporting material and must be visibly quieter.",
  );
}

/**
 * NEW SCREEN — compile a from-scratch screen prompt.
 *
 * Each idea is stated once, in the section that owns it: the user's goal
 * lives in USER AND JOB, what to notice lives in INFORMATION HIERARCHY,
 * anti-pattern rules live in DO NOT. Other sections refer to those
 * rather than restating them in different words.
 */

import type { NewScreenBrief } from "../types";
import {
  EXPANSION_RULE,
  PRIMARY_ACTION_RULE,
  accessibilityBody,
  asSentence,
  atLeast,
  bullets,
  clean,
  contentHonestyBody,
  deep,
  densityLine,
  designSystemBody,
  executionOrderBody,
  explain,
  filled,
  finalReviewBody,
  guardrailsBody,
  lines,
  lowerFirst,
  numbered,
  paragraphs,
  productContextBody,
  renderSections,
  responsiveBody,
  section,
  statesBody,
  toItems,
  type PromptContext,
} from "./shared";

/**
 * Structural expectations per screen type. Shape and behavior only —
 * these never invent product content.
 */
const SCREEN_TYPE_GUIDANCE: Record<string, string> = {
  "Landing page":
    "As a landing page, the top of the screen must establish what this is and who it is for before any feature detail. One conversion action, stated in the same words everywhere it appears. Proof and detail follow the claim; they do not open the page.",
  "Marketing page":
    "As a marketing page, every section must answer a question the reader is actually asking at that point in the page. Do not pad the page with sections that exist only to fill the scroll.",
  Dashboard:
    "As a dashboard, the top of the screen answers 'is anything wrong, and what needs me' before it shows totals. A bare figure in a box is not information — numbers need a comparison or a label. Prefer dense, aligned rows over a field of equal-weight tiles.",
  "Detail page":
    "As a detail page, identity and status come first, then the actions available on this object, then supporting detail. Keep the object's identity visible while the user scrolls its detail.",
  "Directory / listing":
    "As a listing, scanning beats decoration. Align the values that get compared into columns, keep row height tight and consistent, and make filters visible and reversible. Show result count and active filters at all times.",
  Settings:
    "As a settings screen, group by the user's mental model rather than the data model, label controls by what they do, and state what happens when something changes — especially anything destructive.",
  "Form / input flow":
    "As an input flow, one column, one clear order, and visible progress if there is more than one step. Labels above their fields, help text with the field it helps, errors next to what failed with a way to fix it.",
  Onboarding:
    "As onboarding, each step asks for the least it can and explains why it is being asked. Never block the user on something that could be collected later.",
  "Mobile screen":
    "As a mobile screen, the primary action is reachable in the thumb zone and the screen holds a single job. Do not miniaturize a desktop layout.",
  "Empty / zero state":
    "As a zero state, explain what belongs here, why it is worth having, and offer one action that fills it.",
  "Modal / dialog":
    "As a dialog, one decision, stated in the title, with the consequence visible before the confirming action. Size the dialog to its content, not to a grid.",
};

export function compileNewScreen(brief: NewScreenBrief, context: PromptContext): string {
  const { project, detail } = context;

  const screenLabel = filled(brief.screenName)
    ? clean(brief.screenName)
    : filled(brief.screenType)
      ? clean(brief.screenType)
      : "screen";
  const productName = project && filled(project.name) ? clean(project.name) : "";

  const task = paragraphs(
    atLeast(detail, "standard")
      ? "You are acting as a senior product designer and UX architect, not a UI decorator. Decide what matters most here, give it real visual priority, and let everything else recede."
      : "You are acting as a senior product designer. Design for the job below, not for a list of components.",
    lines(
      `Design ${filled(brief.screenType) ? `the ${lowerFirst(clean(brief.screenType))}` : "the screen"} "${screenLabel}"${productName ? ` for ${productName}` : ""}.`,
      filled(brief.whatWeAreDesigning) && asSentence(clean(brief.whatWeAreDesigning)),
    ),
  );

  return renderSections([
    section("ROLE AND TASK", task),
    section("PROJECT CONTEXT", productContextBody(context)),
    section("USER AND JOB", userAndJob(brief, context)),
    section("SCREEN OBJECTIVE", objective(brief)),
    section("SCREEN STRUCTURE", structure(brief, context)),
    section("INFORMATION HIERARCHY", hierarchy(brief, context)),
    section("CONTENT", content(brief, context)),
    section("LAYOUT", layout(brief, context)),
    section("DESIGN SYSTEM — NON-NEGOTIABLE", designSystemBody(context)),
    section("VISUAL DIRECTION", visualDirection(brief, context)),
    section("INTERACTION AND STATES", statesBody(brief.states, brief.interactionNotes, detail)),
    section(
      "RESPONSIVE BEHAVIOR",
      responsiveBody(context, lines(clean(brief.responsivePriorities), clean(brief.responsiveNotes))),
    ),
    section("ACCESSIBILITY", accessibilityBody(context)),
    section("PRESERVE", filled(brief.mustPreserve) ? bullets(toItems(brief.mustPreserve)) : ""),
    section(
      "DO NOT",
      paragraphs(
        filled(brief.mustNotHappen) ? bullets(toItems(brief.mustNotHappen)) : "",
        filled(brief.screenRules) ? `Screen-specific rules:\n${bullets(toItems(brief.screenRules))}` : "",
        guardrailsBody(context),
      ),
    ),
    section("EXECUTION ORDER", executionOrderBody(detail)),
    section("BEFORE YOU FINISH", finalReviewBody(detail)),
  ]);
}

/** The user, their goal and their doubts — stated here and nowhere else. */
function userAndJob(brief: NewScreenBrief, context: PromptContext): string {
  const { project, contextMode, detail } = context;
  const user = filled(brief.primaryUser)
    ? asSentence(clean(brief.primaryUser))
    : contextMode === "embedded" && project
      ? clean(project.primaryUsers)
      : "";

  return paragraphs(
    user && `Primary user: ${lowerFirst(user)}`,
    filled(brief.primaryGoal) &&
      lines(
        `The job: the user comes here to ${lowerFirst(clean(brief.primaryGoal))}.`,
        explain(detail, "Every layout, emphasis and grouping decision below serves that job."),
      ),
    atLeast(detail, "standard") && filled(brief.secondaryGoals)
      ? `Also supported, but never at the expense of that job:\n${bullets(toItems(brief.secondaryGoals))}`
      : "",
    atLeast(detail, "standard") && filled(brief.userConcerns)
      ? `They arrive with these questions, and the design must answer them in place:\n${bullets(toItems(brief.userConcerns))}`
      : "",
    filled(brief.trustFactors) ? `What has to feel clear and trustworthy: ${lowerFirst(asSentence(clean(brief.trustFactors)))}` : "",
  );
}

/** The five-second test plus the structural expectations of this screen type. */
function objective(brief: NewScreenBrief): string {
  return paragraphs(
    filled(brief.primaryGoal)
      ? "Within about five seconds of arriving, the user should know where they are, whether anything needs them, and how to begin the job above."
      : "Within about five seconds of arriving, the user should know where they are, what this screen is for, and what to do next.",
    SCREEN_TYPE_GUIDANCE[clean(brief.screenType)] ?? "",
  );
}

function structure(brief: NewScreenBrief, context: PromptContext): string {
  const { detail } = context;
  const sections = brief.sections.filter(
    (entry) => filled(entry.name) || filled(entry.purpose) || filled(entry.content),
  );
  if (sections.length === 0) return "";

  const written = sections.map((entry, index) => {
    const title = filled(entry.name) ? clean(entry.name) : `Section ${index + 1}`;
    return lines(
      `${index + 1}. ${title}`,
      filled(entry.purpose) && `   Purpose: ${asSentence(clean(entry.purpose))}`,
      filled(entry.content) && `   Content: ${clean(entry.content)}`,
      filled(entry.primaryAction) && `   Action: ${clean(entry.primaryAction)}`,
      filled(entry.notes) && `   Notes: ${asSentence(clean(entry.notes))}`,
    );
  });

  return paragraphs(
    "Build these sections, in this order:",
    written.join("\n\n"),
    explain(detail, "Each section must earn its space. If two are doing the same job, merge them."),
  );
}

function hierarchy(brief: NewScreenBrief, context: PromptContext): string {
  const { detail } = context;
  const items = brief.hierarchy.map((item) => clean(item.text)).filter(Boolean);
  if (items.length === 0) return "";

  return paragraphs(
    "The user should notice things in this order:",
    numbered(items),
    lines(
      "Build that order with size, weight, contrast, position and surrounding space — in that priority, not with color or containers.",
      explain(
        detail,
        "Anything not on this list is supporting material and must be visibly quieter.",
      ),
    ),
  );
}

function content(brief: NewScreenBrief, context: PromptContext): string {
  const { detail } = context;
  return paragraphs(
    filled(brief.requiredContent) ? `This content must appear:\n${bullets(toItems(brief.requiredContent))}` : "",
    filled(brief.primaryCta)
      ? lines(
          `Primary action: "${clean(brief.primaryCta)}" — visible without scrolling, labelled identically everywhere it appears.`,
          explain(detail, PRIMARY_ACTION_RULE),
        )
      : explain(detail, PRIMARY_ACTION_RULE),
    filled(brief.secondaryCta)
      ? `Secondary action: "${clean(brief.secondaryCta)}" — clearly subordinate to the primary action through weight, not only color.`
      : "",
    contentHonestyBody(),
  );
}

function layout(brief: NewScreenBrief, context: PromptContext): string {
  const { contextMode, detail } = context;
  return paragraphs(
    filled(brief.layoutNotes) ? asSentence(clean(brief.layoutNotes)) : "",
    densityLine(brief.density, detail),
    explain(
      detail,
      "Use real Auto Layout with padding and gaps from the spacing scale, so the screen holds together when content length changes.",
    ),
    contextMode === "embedded" ? deep(detail, EXPANSION_RULE) : "",
    deep(
      detail,
      "Set resizing behavior (hug, fill, fixed) deliberately on every frame, and name frames for what they contain so the file stays workable.",
    ),
  );
}

function visualDirection(brief: NewScreenBrief, context: PromptContext): string {
  const { detail } = context;
  return paragraphs(
    filled(brief.visualDirection) ? asSentence(clean(brief.visualDirection)) : "",
    filled(brief.referenceNotes) ? `Reference notes: ${asSentence(lowerFirst(clean(brief.referenceNotes)))}` : "",
    explain(
      detail,
      "Express that direction through typography, spacing, alignment and restraint rather than decoration.",
    ),
  );
}

/**
 * Project Profile → Figma Make Guidelines.md.
 *
 * This is the persistent half of the product. Everything here is true of
 * every screen in the project, so it is written once, installed in the
 * Figma Make project, and deliberately left out of task prompts.
 *
 * Written as instructions, not as a data dump: each section says what
 * the system is AND how it is meant to be used. Nothing task-specific
 * ever belongs in this file.
 */

import {
  asSentence,
  bullets,
  clean,
  filled,
  guardrailItems,
  lines,
  lowerFirst,
  paragraphs,
  toItems,
} from "./prompts/shared";
import type { ProjectProfile } from "./types";

interface Block {
  heading: string;
  level: 2 | 3;
  body: string;
}

function block(heading: string, level: 2 | 3, body: string): Block | null {
  const text = clean(body);
  return text ? { heading, level, body: text } : null;
}

function render(title: string, blocks: Array<Block | null>): string {
  const rendered = blocks
    .filter((entry): entry is Block => Boolean(entry))
    .map((entry) => `${entry.level === 2 ? "##" : "###"} ${entry.heading}\n\n${entry.body}`)
    .join("\n\n");
  return `# ${title}\n\n${rendered}\n`;
}

export function compileGuidelines(project: ProjectProfile, guardrails: boolean): string {
  const name = filled(project.name) ? clean(project.name) : "This project";

  const overview = paragraphs(
    filled(project.productDescription) ? asSentence(project.productDescription) : "",
    filled(project.primaryUsers) ? `**Primary users.** ${asSentence(project.primaryUsers)}` : "",
    "Treat this document as the authoritative design system for every screen in this project. Apply it to all work unless a specific task explicitly overrides a rule, and prefer these rules over general design instincts or defaults.",
  );

  const principles = paragraphs(
    filled(project.brandDirection) ? `**Experience direction.** ${asSentence(project.brandDirection)}` : "",
    bullets([
      "Design for what the user is trying to accomplish, not for a list of components.",
      "Give the most important thing on a screen unmistakable visual priority; let everything else recede.",
      "Create hierarchy with type scale, weight, position and space before reaching for color or containers.",
      "Where the workflow has a clear next step, give that action dominance. Do not create several equal-weight primary actions unless a task genuinely requires them.",
      "Prefer removing an element over adding one. If a section is not doing a job, it should not exist.",
    ]),
  );

  const typography = lines(
    filled(project.headingTypeface) && `**Headings.** ${asSentence(project.headingTypeface)}`,
    filled(project.bodyTypeface) && `**Body and UI.** ${asSentence(project.bodyTypeface)}`,
    "Use only these styles. Do not introduce one-off sizes, weights or line heights, and keep the number of distinct levels on any screen small and deliberate.",
  );

  const colorTokens = project.colors
    .filter((token) => filled(token.name) || filled(token.value))
    .map((token) => {
      const value = filled(token.value) ? `\`${clean(token.value)}\`` : "";
      const head = [clean(token.name), value].filter(Boolean).join(" — ");
      return filled(token.purpose) ? `${head} — ${lowerFirst(token.purpose)}` : head;
    });

  const color = colorTokens.length
    ? lines(
        bullets(colorTokens),
        "",
        "Use these tokens only. Do not introduce new hues or tints. Color carries meaning here — it is not a substitute for hierarchy that typography and spacing should be creating.",
      )
    : "";

  const spacing = filled(project.spacingScale)
    ? lines(
        `\`${clean(project.spacingScale)}\``,
        "",
        "Every margin, padding and gap comes from this scale. No one-off values. Space between groups should be visibly larger than space within a group.",
      )
    : "";

  const grid = lines(
    filled(project.grid.columns) && `- Columns: ${clean(project.grid.columns)}`,
    filled(project.grid.maxWidth) && `- Content max width: ${clean(project.grid.maxWidth)}`,
    filled(project.grid.gutters) && `- Gutters: ${clean(project.grid.gutters)}`,
    filled(project.grid.margins) && `- Outer margins: ${clean(project.grid.margins)}`,
    "",
    "Align content to the grid and span whole columns. Break the grid only where the result is visibly better, and make the break look deliberate.",
  );

  const responsive = lines(
    filled(project.breakpoints) && `**Breakpoints.** ${asSentence(project.breakpoints)}`,
    "",
    bullets([
      "The information hierarchy must survive every breakpoint. Narrow layouts reflow and stack; they do not reorder priorities or hide primary actions behind menus.",
      "Never solve a narrow viewport by shrinking type below readable sizes.",
      "Set resizing behavior (hug, fill, fixed) intentionally on every frame so layouts reflow rather than break or clip.",
    ]),
  );

  const accessibilityRules = toItems(project.accessibility);
  const accessibility = lines(
    bullets([
      ...accessibilityRules,
      "Body text meets at least 4.5:1 contrast against its background; large text and meaningful icons at least 3:1.",
      "Every interactive element has a visible focus state that does not rely on color alone.",
      "Touch targets are at least 44×44px. Where a control's specified visual size is smaller, keep the visual size and extend the interactive area with padding or an invisible hit area — do not enlarge the visible control to satisfy this.",
      "Never use color alone to carry meaning — pair it with text, weight, an icon or position.",
      "Headings follow a sensible order and labels sit with their inputs, so screens read correctly top to bottom.",
    ]),
  );

  const composition = bullets([
    "Build with Auto Layout and real components, with padding, gap, alignment and resizing set explicitly, so layouts hold when content length changes.",
    "Group by proximity and alignment before introducing a container. A box is justified when it groups things that genuinely belong together and are separated from what surrounds them.",
    "If more room is needed, expand the parent frame. Do not shrink typography, compress spacing, clip content, break component proportions or force awkward wrapping to make something fit.",
    "Keep comparable values aligned into columns so they can be scanned rather than hunted.",
    "Treat supplied content as the only source of fact. Do not invent statistics, prices, customer counts, testimonials, logos, awards, integrations or product capabilities. Do write the interface copy a screen needs — labels, helper text, validation messages, empty-state guidance — without asserting an unsupplied fact. Never use lorem ipsum.",
  ]);

  const permanent = filled(project.permanentRules) ? bullets(toItems(project.permanentRules)) : "";
  const doNot = filled(project.doNotRules) ? bullets(toItems(project.doNotRules)) : "";

  const { avoid, prefer } = guardrailItems();
  const aiGuardrails = guardrails
    ? paragraphs(
        "Output must not read as generic AI-generated UI. Avoid:",
        bullets(avoid),
        "Before adding a container, shadow, badge or icon, try:",
        bullets(prefer),
      )
    : "";

  return render(`${name} — Design Guidelines`, [
    block("Project overview", 2, overview),
    block("Experience principles", 2, principles),
    block("Design system", 2, "Everything in this section is binding. Where a task appears to conflict with it, this document wins."),
    block("Typography", 3, typography),
    block("Color", 3, color),
    block("Spacing", 3, spacing),
    block("Grid and layout", 3, grid),
    block("Radius", 3, filled(project.radius) ? asSentence(project.radius) : ""),
    block("Borders", 3, filled(project.borders) ? asSentence(project.borders) : ""),
    block("Elevation", 3, filled(project.shadows) ? asSentence(project.shadows) : ""),
    block("Icons", 3, filled(project.icons) ? asSentence(project.icons) : ""),
    block("Buttons and actions", 3, filled(project.buttons) ? asSentence(project.buttons) : ""),
    block("Imagery and illustration", 3, filled(project.imagery) ? asSentence(project.imagery) : ""),
    block("Responsive behavior", 2, responsive),
    block("Accessibility", 2, accessibility),
    block("Composition principles", 2, composition),
    block("Permanent rules", 2, permanent),
    block("Do not", 2, doNot),
    block("AI UI guardrails", 2, aiGuardrails),
  ]);
}

export const GUIDELINES_FILENAME = "Guidelines.md";

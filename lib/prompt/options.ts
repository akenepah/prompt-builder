/** Option lists shared by the forms. Keys must match the copy maps in the prompt compilers. */

import type { Density, PromptMode, QADepth } from "./types";

export const MODES: Array<{ id: PromptMode; label: string; blurb: string }> = [
  { id: "new-screen", label: "New screen", blurb: "Design a page or app screen from scratch." },
  { id: "reference", label: "Reference translation", blurb: "Borrow principles from a reference without copying it." },
  { id: "refine", label: "Refine existing", blurb: "A precision pass on part of an approved screen." },
  { id: "qa", label: "Design QA", blurb: "Inspect and correct an existing design." },
];

export const SCREEN_TYPES = [
  "Landing page",
  "Marketing page",
  "Dashboard",
  "Detail page",
  "Directory / listing",
  "Settings",
  "Form / input flow",
  "Onboarding",
  "Mobile screen",
  "Empty / zero state",
  "Modal / dialog",
] as const;

export const DENSITIES: Array<{ id: Exclude<Density, "">; label: string }> = [
  { id: "spacious", label: "Spacious" },
  { id: "balanced", label: "Balanced" },
  { id: "dense", label: "Dense" },
];

export const STATES = [
  "Default",
  "Hover",
  "Focus",
  "Active",
  "Selected",
  "Disabled",
  "Loading",
  "Empty",
  "Error",
  "Success",
] as const;

export const BORROW_OPTIONS = [
  "Overall composition",
  "Grid",
  "Spacing",
  "Typography hierarchy",
  "Content density",
  "Navigation",
  "Component treatment",
  "Imagery",
  "Color balance",
  "Visual rhythm",
  "Interaction pattern",
] as const;

export const REFINEMENT_OPTIONS = [
  "Spacing",
  "Hierarchy",
  "Alignment",
  "Typography",
  "Readability",
  "Component proportions",
  "Content grouping",
  "Auto Layout",
  "Wrapping",
  "Clipping",
  "Overflow",
  "Responsive behavior",
  "Accessibility",
  "Visual consistency",
] as const;

export const QA_OPTIONS = [
  "Typography",
  "Hierarchy",
  "Spacing",
  "Alignment",
  "Grid",
  "Auto Layout",
  "Clipping",
  "Overflow",
  "Wrapping",
  "Responsive behavior",
  "Component consistency",
  "Colors",
  "Accessibility",
  "States",
  "Touch targets",
] as const;

export const QA_DEPTHS: Array<{ id: QADepth; label: string; hint: string }> = [
  { id: "conservative", label: "Conservative", hint: "Objective defects only" },
  { id: "standard", label: "Standard", hint: "Defects and clear inconsistencies" },
  { id: "thorough", label: "Thorough", hint: "Also weak hierarchy and grouping" },
];

/**
 * Figma Prompt Builder — domain model.
 *
 * Everything the user types lives in one of these shapes. The prompt
 * compilers in `lib/figma-prompt/prompts` are pure functions of
 * (brief, project, settings) so the same brief always produces the same
 * prompt, and so an LLM enhancement pass can later wrap the compiler
 * without any UI change.
 */

export type PromptMode = "new-screen" | "reference" | "refine" | "qa";

export interface ColorToken {
  id: string;
  name: string;
  value: string;
  purpose: string;
}

export interface GridSpec {
  columns: string;
  maxWidth: string;
  gutters: string;
  margins: string;
}

export interface ProjectProfile {
  id: string;
  name: string;
  productDescription: string;
  primaryUsers: string;
  brandDirection: string;
  headingTypeface: string;
  bodyTypeface: string;
  colors: ColorToken[];
  spacingScale: string;
  grid: GridSpec;
  radius: string;
  borders: string;
  shadows: string;
  icons: string;
  buttons: string;
  imagery: string;
  breakpoints: string;
  accessibility: string;
  permanentRules: string;
  doNotRules: string;
  createdAt: number;
  updatedAt: number;
}

/** A repeatable, reorderable screen section. */
export interface SectionSpec {
  id: string;
  name: string;
  purpose: string;
  content: string;
  primaryAction: string;
  notes: string;
}

/** A repeatable, reorderable hierarchy entry. */
export interface HierarchyItem {
  id: string;
  text: string;
}

export type Density = "spacious" | "balanced" | "dense" | "";

export interface NewScreenBrief {
  screenName: string;
  screenType: string;
  whatWeAreDesigning: string;

  primaryUser: string;
  primaryGoal: string;
  secondaryGoals: string;
  userConcerns: string;
  trustFactors: string;

  sections: SectionSpec[];
  requiredContent: string;
  primaryCta: string;
  secondaryCta: string;

  hierarchy: HierarchyItem[];

  visualDirection: string;
  layoutNotes: string;
  referenceNotes: string;
  density: Density;

  interactionNotes: string;
  states: string[];

  responsivePriorities: string;
  responsiveNotes: string;

  screenRules: string;
  mustNotHappen: string;
  mustPreserve: string;
}

export interface ReferenceBrief {
  targetScreen: string;
  whatWeAreCreating: string;

  referenceName: string;
  referenceDescription: string;
  borrowAspects: string[];
  specificallyBorrow: string;
  doNotBorrow: string;

  mustRemainOurs: string;
  requiredContent: string;
  primaryGoal: string;
  hierarchy: HierarchyItem[];
  constraints: string;
}

export interface RefineBrief {
  frameName: string;
  areaBeingChanged: string;
  currentProblem: string;
  desiredResult: string;
  untouched: string;
  mayChange: string;
  categories: string[];
  protectExisting: boolean;
  expandContainers: boolean;
  notes: string;
}

export type QADepth = "conservative" | "standard" | "thorough";

export interface QABrief {
  frameName: string;
  categories: string[];
  knownIssues: string;
  unchanged: string;
  notes: string;
  depth: QADepth;
  expandContainers: boolean;
}

/** The live, autosaved working state of the builder. */
export interface Draft {
  mode: PromptMode;
  projectId: string;
  guardrails: boolean;
  newScreen: NewScreenBrief;
  reference: ReferenceBrief;
  refine: RefineBrief;
  qa: QABrief;
}

export interface SavedPrompt {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  mode: PromptMode;
  createdAt: number;
  updatedAt: number;
  guardrails: boolean;
  brief: NewScreenBrief | ReferenceBrief | RefineBrief | QABrief;
  prompt: string;
}

export interface Settings {
  defaultProjectId: string;
}

export interface PersistedState {
  version: 1;
  projects: ProjectProfile[];
  savedPrompts: SavedPrompt[];
  draft: Draft;
  settings: Settings;
}

export type ReadinessLevel = "needs-context" | "good" | "strong";

export interface Readiness {
  level: ReadinessLevel;
  label: string;
  suggestions: string[];
}

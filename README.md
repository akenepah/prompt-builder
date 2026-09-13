# Figma Prompt Builder

A short structured design brief in, a production-quality prompt for Figma AI / Figma Make out.

Strong UI prompts have to say the same things every time — who the user is, what they are
trying to do, what should be noticed first, what the layout and design-system rules are, what
must not change, and which AI-design clichés to avoid. Writing that by hand for every screen
is repetitive. This tool holds the prompt engineering so the brief can stay small.

**The generated prompt is the product.** Form values are never dumped into a template; they
are compiled into written instructions, and anything left blank produces no section at all.

## Modes

| Mode | For |
| --- | --- |
| **New screen** | A page or app screen from scratch |
| **Reference translation** | Borrowing principles from a screenshot, site or frame without copying it |
| **Refine existing** | A precision pass on part of an already-approved screen |
| **Design QA** | Inspecting and correcting an existing design |

## What makes the output good

- **Behavior, not components.** The prompt describes the user, their job, what they are
  uncertain about and what must feel obvious — before it describes any UI.
- **Explicit hierarchy.** An ordered list of what to notice first, second, third, with
  instructions to build that order from size, weight, position and space.
- **Design system as law.** Project profiles carry type, color tokens, spacing scale, grid,
  radii, borders, elevation, icon and button rules into every prompt, and state that the
  system wins any conflict with the brief.
- **Options expand into instructions.** "Dense" becomes a paragraph on holding body size and
  tightening spacing; "Auto Layout" as a QA check becomes a list of what to actually verify.
- **Preservation.** Refine mode states, in strong language, that the rest of the screen is
  approved and final — Figma's most common failure is over-correcting a whole page.
- **Reference ≠ copy.** Reference mode separates REFERENCE PRINCIPLES from TARGET PRODUCT
  RULES and always excludes the reference's type, color and content.
- **Never solve overflow by shrinking.** Where it applies, the prompt instructs expanding the
  parent frame rather than compressing type, spacing or proportions.
- **Anti-AI-UI guardrails.** A default-on block against default card packaging, gradients,
  glassmorphism, decorative charts, invented statistics and lorem ipsum.
- **A closing self-review.** Ten questions Figma must answer about its own output before
  finishing, with instructions to fix rather than note.

## Running it

```bash
npm install
npm run dev            # http://localhost:3000
npm run typecheck && npm run lint && npm test && npm run build
```

No accounts, no database, no API keys. Everything — project profiles, saved prompts, the
current draft — persists to `localStorage` in the browser.

## Architecture

```
lib/prompt/
  prompts/          newScreen · referenceTranslation · refineExisting · designQA · shared
  types.ts          the whole domain model
  defaults.ts       empty briefs, the sample project and sample brief
  presets.ts        New Screen starting points (structure only — never product content)
  options.ts        option lists, keyed to the copy maps in the compilers
  readiness.ts      weighted signal scoring, not a field count
  storage.ts        versioned localStorage blob, safe against garbage and disabled storage
  store.ts          useSyncExternalStore-backed state with debounced persistence
components/         workspace, forms, repeatable builders, prompt panel, modals, primitives
```

Every compiler is a pure function of `(brief, project, guardrails)`, so output is
deterministic and testable. `PromptEnhancer` in `lib/prompt/prompts/index.ts` is the seam for
an optional LLM polish stage — it would wrap the compiled prompt without any UI change.

`npm test` covers the prompt layer: omitted empty sections, preservation language,
reference-vs-copy separation, option expansion, readiness scoring and storage recovery.

## Sample project

A fictional product — *Ledgerline*, a 13-week cash forecasting tool — ships with a fully
specified design system and a sample New Screen brief, so the value is visible on first open.
Reset clears it; **Load sample brief** brings it back.

## Deployment

Any Next.js host. On Vercel: import the repository and deploy — nothing to configure and no
environment variables to set.

# Frontend Agent Guidelines

Scope: These rules apply only to the frontend project in this folder.

## Source of truth
- This file is the canonical frontend guidance.
- `copilot-instructions.md` must stay aligned with this file.

## Project stack
- Framework: Vue 3 + TypeScript.
- UI library: PrimeVue v4.
- State: Pinia.
- Styling: Tailwind CSS v4 + SCSS for shared theme variables.
- HTTP client: Axios.

## Mandatory frontend rules
- Use PrimeVue components for UI elements that PrimeVue already provides.
- Do not use PrimeReact in this project.
- Keep code-facing text in English (comments, API messages, docs snippets, and UI technical labels).

## PrimeVue styling policy (strict)
- Do not use PrimeVue `pt` for styling.
- PrimeVue visual customization must be done only by overriding PrimeVue variables/tokens.
- Keep token overrides in a reusable SCSS base file (shared layer), not scattered across components.
- Prefer a single shared entrypoint for PrimeVue theme overrides so changes are centralized.

## Tailwind usage policy
- For non-PrimeVue elements, use Tailwind utility classes when styling is needed.
- Tailwind can be used for layout composition around PrimeVue components.
- Avoid duplicating the same Tailwind patterns; extract reusable wrappers/classes when repeated.

## Execution behavior (moderate validation)
- Run type-check and build when changes are meaningful or can affect runtime behavior.
- Avoid unnecessary full test suites for trivial text-only changes.
- Report what was validated and what was not run.

## Change hygiene
- Keep edits focused and minimal.
- Do not modify backend files when implementing frontend-only requests.
- Preserve existing architecture unless the task explicitly asks for refactoring.

## Output expectations
- Provide concise change summaries with file references.
- Highlight assumptions and risks when requirements are ambiguous.

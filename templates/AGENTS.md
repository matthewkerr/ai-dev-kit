# AGENTS.md

## Purpose
This repository is worked on by humans and Codex together. Optimize for safe, high-signal changes that are easy to review and verify.

## Working Style
- Read the relevant code before proposing or making changes.
- Prefer understanding existing patterns over introducing new abstractions.
- Make the smallest change that fully solves the problem.
- Preserve existing architecture unless the task explicitly asks for refactoring.
- If the request is ambiguous, make the safest reasonable assumption and state it in the final summary.
- Do not create speculative cleanup changes outside the task scope.

## Editing Rules
- Do not overwrite or revert user changes you did not make.
- Avoid touching unrelated files.
- Preserve comments unless they are outdated or incorrect.
- Follow the existing naming, file structure, and code style of the repository.
- Prefer consistency with nearby code over generic best practices.
- Keep diffs tight and reviewable.

## Code Quality
- Favor clarity over cleverness.
- Prefer explicit control flow over compact but hard-to-read code.
- Introduce helpers only when they reduce duplication or complexity meaningfully.
- Avoid premature abstraction.
- Add concise comments only where the logic is non-obvious.
- Do not add dependencies unless necessary for the task.

## Testing
- When changing behavior, add or update tests when the codebase already has a testing pattern for that area.
- Run the smallest relevant tests first.
- If full verification is expensive, do targeted verification and say what was not run.
- Do not claim success without stating what was actually verified.

## Debugging
- Reproduce the issue when possible before fixing it.
- Identify the likely root cause before editing.
- Prefer fixes that address the root cause, not just the visible symptom.
- If multiple causes are plausible, call out the uncertainty briefly.

## Refactoring
- Refactor only when it directly supports the requested task.
- Preserve behavior unless behavior change is explicitly requested.
- Keep public interfaces stable unless the task requires changing them.
- When refactoring, update affected tests and imports.

## Review Standard
When asked to review code:
- Prioritize bugs, regressions, security risks, data loss risks, and missing tests.
- Keep style comments secondary.
- Provide concrete file references when possible.
- If no serious issues are found, say that clearly and mention residual risks.

## Communication
- Be concise and practical.
- Summaries should include:
  - what changed
  - why it changed
  - how it was verified
  - any remaining risks or assumptions
- Do not dump large explanations unless asked.
- Ask at most one clarifying question when blocked on a high-impact ambiguity.

## Safety
- Never run destructive commands unless explicitly requested.
- Never use reset-style commands to discard work without permission.
- Treat the worktree as potentially dirty at all times.
- If unexpected changes appear in files related to the task, stop and account for them instead of overwriting them.

## Project Preferences
- Prefer targeted fixes over broad rewrites.
- Prefer local reasoning over global rewiring.
- Keep API and schema changes explicit.
- Call out migrations, breaking changes, and config changes clearly.

## Default Task Flow
1. Inspect the relevant files and nearby patterns.
2. Make the minimal correct change.
3. Update or add focused tests if appropriate.
4. Run relevant verification.
5. Summarize edits, verification, and assumptions.

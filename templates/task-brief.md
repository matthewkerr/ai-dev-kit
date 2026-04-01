<!--
FILE: docs/task-brief.md
PURPOSE: Fill-in-the-blank brief to complete before any significant Cursor or Claude
         Code session. Forces explicit goal, scope, constraints, and definition of done
         before the AI writes a single line. Paste as your first message or save as
         docs/current-task.md in the project root for the session.
         The OUT OF SCOPE section is the highest-value part — it stops Cursor from
         "helpfully" refactoring things you didn't ask about.
WORKFLOW: Copy → fill in → paste into Cursor chat → delete the Notes section at bottom.
-->

# Task Brief

> Fill this in before starting any significant Cursor session.
> Paste it as your first message, or save as docs/current-task.md.
> The more precise this is, the less back-and-forth you'll need.

---

## Goal
<!-- One sentence. What is done when this task is complete? -->
<!-- Example: "Add card favoriting to [Your App] so users can bookmark readings" -->


## Context
<!-- Why now? What triggered this? What has already been tried or decided? -->


## Scope

### Files / areas IN scope
<!-- Be specific — file paths, route names, component names -->
- 


### Files / areas OUT OF scope
<!-- Explicit exclusions prevent drift. What should NOT be touched? -->
- Do not modify: 
- Do not change the database schema for: 
- Do not refactor: 

### Related files for context (read but don't modify)
<!-- Files the AI should understand but not change -->
- 

## Constraints
<!-- Technical constraints, design constraints, things that must remain true -->
- Must work on both iOS and Android / Must pass existing tests / etc.
- 

## Definition of Done
<!-- How will you know this is complete? Be concrete. -->
- [ ] 
- [ ] Tests pass (`npm test` / `php artisan test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Tested manually: 

## What NOT to do
<!-- Patterns the AI tends to reach for that you don't want here -->
- Don't install new packages without asking first
- Don't refactor code outside the scope above
- Don't change the API response shape
- 

## Ask before proceeding if...
<!-- Situations where the AI should stop and check rather than assume -->
- The approach requires changing the database schema
- A new dependency is needed
- The scope seems larger than expected
- 

---

<!-- Remove this section before pasting into Cursor -->
## Notes for filling this in

Good goal statements:
- "Add email verification to the signup flow in the Laravel API"
- "Fix the card spread layout breaking on iPhone SE screens"
- "Build the signal ingestion worker for [Your App] — arXiv source only"

Bad goal statements:
- "Improve the auth system" (too vague)
- "Fix bugs" (which bugs?)
- "Refactor the codebase" (scope is everything)

The OUT OF SCOPE section is the most important part.
It stops Cursor from "helpfully" rewriting things you didn't ask about.

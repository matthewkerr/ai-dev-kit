# Planning Templates
> This file is pasted into the planning session when Phase 2 document generation begins.
> It contains all document format specs, standard blocks, and verbatim templates.

---

## Shared Patterns (Referenced Across All Documents)

### Agent Safety Pattern
Every background worker or autonomous agent must:
- Check killswitch at startup: `if (process.env.AGENT_ENABLED !== 'true') return`
- Respect dry-run: wrap all writes in `if (!DRY_RUN)`
- Be idempotent: check for existing records before writing
- Use structured logging: agent name, session ID, item ID, result, timestamp
- Wrap external calls in retry logic with exponential backoff
- Exit `process.exit(1)` on fatal error so PM2 restarts

### Model Routing Pattern
All LLM calls route through `models.config.js` using symbolic tier names. Never hardcode model names or call provider APIs directly.
```javascript
module.exports = {
  FAST:        process.env.MODEL_FAST,        // High-speed, low-cost tasks
  REASONING:   process.env.MODEL_REASONING,   // Complex reasoning, planning
  CHEAP:       process.env.MODEL_CHEAP,       // Bulk/volume tasks
  LOCAL:       process.env.MODEL_LOCAL,       // Ollama, no API cost
  MULTIMODAL:  process.env.MODEL_MULTIMODAL,  // Vision / audio tasks
}
```

### Logging Standard
```json
{ "agent": "", "sessionId": "", "itemId": "", "action": "", "result": "", "durationMs": 0, "dryRun": false, "timestamp": "" }
```
Errors always include: message, stack, and the entity being processed.

### Infrastructure Map
- **Dev**: local SQLite/Postgres/MySQL, local Ollama, no cloud DB spend
- **Production web**: Vercel (Next.js), Supabase (if DB needed), Cloudflare (DNS/tunnel)
- **Production agents**: Mac Mini running PM2 + Ollama, Cloudflare Tunnel for external access

---

## Document Specs

### `PROJECT_OVERVIEW.md`
The master reference document.

Include:
- Project name, one-sentence description, elevator pitch
- Problem statement
- Goals and non-goals for v1
- Success criteria
- High-level architecture narrative (prose — describe how the pieces connect)
- List of all other planning documents with one-line descriptions
- Open questions / known unknowns

---

### `ARCHITECTURE.md`
System design and component map.

Include:
- Component inventory (every major piece: services, workers, queues, APIs, frontends)
- How components communicate (REST, webhooks, polling, message queues, etc.)
- Data flow narrative: trace a single request/event from entry to output
- External dependencies (third-party APIs, services, LLMs)
- Infrastructure map — see Shared Patterns → Infrastructure Map
- Agent patterns where applicable — see Shared Patterns → Agent Safety Pattern and Model Routing Pattern
- Scalability and failure mode notes

---

### `DATABASE.md`
All data model and schema decisions.

Include:
- Entity list with plain-English descriptions
- Full schema for each table: column names, types, constraints, defaults, PKs, FKs, indexes (with rationale), soft delete / timestamps strategy
- Entity relationship summary (prose + ASCII or Mermaid ERD if helpful)
- Environment database strategy:
  - Dev: local SQLite/Postgres/MySQL (specify which and why — default local to avoid cloud costs)
  - Prod: Supabase (preferred for realtime/auth/storage) or AWS RDS (preferred for control, existing AWS, MySQL compat)
- Migration strategy notes
- Seed data requirements
- Data privacy notes (PII, encryption)

> **Rule**: All database and schema content lives exclusively in this file. No table definitions appear in other documents.

---

### `UI_AND_DESIGN.md`
*(Produce only if the project has a UI)*
All frontend design decisions in one place.

Include:
- Design intent and visual character
- Platform context: web (Next.js 16 + Tailwind), mobile (Expo SDK 54 + RN StyleSheet), or both
- Styling approach:
  - Web: Tailwind CSS exclusively via utility classes, configured in `tailwind.config.js`
  - Mobile: `StyleSheet.create()` exclusively — no NativeWind, no third-party styling libraries
- Tailwind config: custom color tokens, font sizes, spacing, plugins
- Color palette: primary, secondary, accent, background, surface, error, warning, success — hex values AND Tailwind token names — dark mode equivalents
- Typography: font families (display, body, mono), loading method, scale mapped to Tailwind classes, weights
- Spacing and layout system
- Component inventory: list, state variants (empty/loading/error/success) for complex ones, component library or bespoke
- Navigation structure and key user flows
- Motion and interaction notes
- Accessibility requirements (WCAG level, keyboard nav, color contrast)

> **Rule**: All color values, font choices, and visual specs live exclusively in this file.

---

### `DECISIONS.md`
Technical decision log — every significant architectural choice made during planning.

Every entry uses this format:

```markdown
## Decision [NN] — [Short title]
**Date**: [Planning session date]
**Status**: Accepted

### Context
[What problem prompted this decision. What constraints existed.]

### Options Considered
| Option | Pros | Cons |
|---|---|---|
| [Option A] | [Why it appealed] | [Why rejected or risky] |
| [Option B] | [Why it appealed] | [Why rejected or risky] |

### Decision
[What was chosen and precisely why.]

### Consequences
[What this makes easier. What it makes harder. What it closes off.]

### Revisit If
[The condition under which this should be reconsidered.]
```

**Always log:**
- Database platform choice and why
- Production DB engine choice and why
- Authentication approach and provider
- LLM provider and tier assignment for each agent step, with cost/quality rationale
- Any deviation from the standard stack
- Any feature explicitly deferred to v2 and why
- Any significant data model choice with multiple viable options

> **Rule**: Append-only. Never delete or overwrite — add a new entry marked "Superseded Decision [NN]" if something changes.

---

### `ENV_AND_CONFIG.md`
Complete environment variable and configuration reference.

```markdown
# Environment Variables & Configuration

## Environment Matrix

| Variable | Dev | Staging | Prod | Secret | Source |
|---|---|---|---|---|---|
| `DATABASE_URL` | local postgres URL | [staging DB URL] | [prod DB URL] | ✓ | Set manually |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://staging.example.com` | `https://example.com` | — | Set manually |
| `MODEL_FAST` | `llama3.2` | `claude-haiku` | `claude-haiku` | — | `models.config.js` |

## Variable Definitions

### `[VARIABLE_NAME]`
- **Purpose**: [What this controls]
- **Format**: [string / URL / boolean / JSON / etc.]
- **Required**: [yes / no — what breaks if missing]
- **Default**: [safe default or "none"]
- **Where to get it**: [how to obtain the value]

## .env File Structure

### `.env.local` (development — never committed)
```env
DATABASE_URL=postgresql://localhost:5432/[project]_dev
MODEL_FAST=llama3.2
MODEL_REASONING=qwen2.5-coder
MODEL_LOCAL=llama3.2
```

### `.env.example` (committed — safe placeholder values only)
```env
DATABASE_URL=postgresql://localhost:5432/myapp_dev
MODEL_FAST=llama3.2
```

## Secrets Management
- [Where production secrets are stored: Vercel dashboard / AWS Secrets Manager / etc.]
- [Who has access]
- [Rotation policy if applicable]

## models.config.js Structure
```javascript
// → See Shared Patterns → Model Routing Pattern
```
```

> **Rule**: No variable may appear in code that is not documented here. No secret committed to version control.

---

### `AGENT_SPEC.md`
*(Produce only if the project includes an autonomous agent or LLM pipeline)*
Complete behavioral specification for the agent.

Include:
- Agent purpose and personality (if applicable)
- Trigger mechanism (cron, webhook, event stream, manual)
- Input specification (data received, format, source)
- Decision logic (what the agent evaluates, criteria used)
- Output specification (what it produces, where it sends it)
- Human-in-the-loop checkpoints (approval queues, Telegram/Slack gates)
- Dry-run behavior — see Shared Patterns → Agent Safety Pattern
- Error states and recovery behavior
- LLM model selection for each pipeline step:
  - Tier (FAST / REASONING / CHEAP / LOCAL / MULTIMODAL)
  - Provider and model, and why (quality fit, cost, context window, tool use, speed)
  - Flag steps where model choice is uncertain — validate with testing
- Prompt design notes (key prompts, system messages, expected output format)
- Logging and observability plan — see Shared Patterns → Logging Standard
- Killswitch and safety mechanisms — see Shared Patterns → Agent Safety Pattern

---

### `API_SPEC.md`
*(Produce only if the project exposes or consumes an API)*
All endpoint and integration definitions.

Include:
- Base URL and versioning strategy
- Authentication method (JWT, API key, OAuth, etc.)
- For each endpoint: method + path, description, request params/body (with types), response shape (with types), error codes
- Webhook definitions
- Rate limiting strategy
- External API integrations: endpoint used, auth method, rate limits, fallback behavior

---

### `IMPLEMENTATION_PLAN.md`
Master phase index — produced before any phase documents.

Include:
- Feature inventory: every feature numbered, in plain English
- Phase sequence table:

```markdown
| Phase | Feature | Depends On | Complexity | Status |
|---|---|---|---|---|
| 01 | Project scaffolding & environment setup | — | S | [ ] |
| 02 | Database schema & migrations | 01 | M | [ ] |
| 03 | Authentication | 02 | M | [ ] |
| 04 | [Feature name] | 03 | L | [ ] |
```

- Dependency map: which phases must be complete before each subsequent phase
- Complexity estimate per phase (S / M / L / XL)
- Overall risk register: cross-phase risks, integration risks, unknowns that could reorder phases
- Definition of "phase complete"

> **Rule**: Phases numbered zero-padded (`01`, `02`...). Phase index updated as phases complete — `[ ]` → `[x]`.

---

### `PHASE_NN_[FEATURE_NAME].md`
One document per feature. One feature per phase. Always.

**Filename format**: `PHASE_01_PROJECT_SETUP.md`, `PHASE_02_DATABASE.md`, etc.

```markdown
# Phase [NN] — [Feature Name]

## Overview
[2–3 sentences: what this phase builds, why it comes here, what it unlocks]

## Prerequisites
- Phase [NN-x] complete and signed off
- [Any environment setup, credentials, or external services needed]
- [Any data or seed state required]

## Scope
**In scope:**
- [Exactly what this phase builds]

**Out of scope:**
- [What is explicitly NOT being built in this phase]

## Implementation Steps

### Step 1 — [Step name]
[Specific instruction. Not "set up the database" but "create migration file `YYYYMMDD_create_users_table` with the following columns…"]

**Files to create or modify:**
- `path/to/file.ts` — [what changes and why]

**Code pattern to follow:**
[Reference to `SKILLS.md` skill, or inline example if novel]

### Step 2 — [Step name]
[Continue. Each step completable in a single focused session.]

## Automated Tests

### Unit Tests
- **Test**: `[test file path]` — `[test name]`
- **What it verifies**: [one sentence]
- **Run command**: `npm test [path]`
- **Expected result**: [exactly what passing looks like]

### Integration Tests
- **Test**: `[test file path]` — `[test name]`
- **Run command**: `npm run test:integration [path]`
- **Expected result**: [exactly what passing looks like]

### Run All Tests for This Phase
```bash
[exact command]
```
**All tests must pass before manual testing.**

## Manual Testing Checklist

- [ ] **[Check 1]**: [Exact steps + expected outcome]
  - Navigate to: `[URL or screen]`
  - Action: [click / enter / submit]
  - Expected: [precise correct outcome]
  - If wrong: [what to check first]

- [ ] **Edge case — [description]**: [Steps + expected outcome]

- [ ] **[Final smoke test]**: [End-to-end verification]

## Definition of Done

- [ ] All implementation steps completed
- [ ] All automated tests passing
- [ ] All manual testing checklist items checked off
- [ ] No console errors or warnings introduced
- [ ] No regressions in previously completed phases
- [ ] Code committed: `feat: phase [NN] — [feature name] complete`

## Known Risks & Gotchas
[Anything that could go wrong and what to do. Leave blank if none.]

## Next Phase
**Phase [NN+1] — [Next feature name]** can begin once this phase's Definition of Done is fully satisfied.
```

> **Rule**: No phase document may reference future phase implementation details.
> **Rule — Complexity Budget**: >8 implementation steps OR L/XL complexity → split before generating. Sub-phase naming: `PHASE_04a_AUTH_SETUP.md`, `PHASE_04b_AUTH_SESSION.md`.
> **Rule**: Phase order — scaffolding → DB → auth → business logic → UI.

---

### `CHANGELOG.md`
Pre-populated structure during planning; filled in as phases complete.

```markdown
# Changelog

All notable changes to this project are documented here.

---

## [Unreleased]

- Phase 01 — Project scaffolding & environment setup
- Phase 02 — [name]
[continue for all planned phases]

---

## Released

<!-- Add entries here as phases are signed off -->
<!--
### Phase [NN] — [Feature Name]
**Completed**: YYYY-MM-DD
**Commit**: `feat: phase [NN] — [feature name] complete`

**What shipped:**
- [Specific thing built]

**Decisions made during implementation:**
- [Any deviation from the plan, and why]

**Known issues / follow-up:**
- [Anything deferred or noted]
-->
```

> **Rule**: Add to Released only after Definition of Done is fully satisfied.

---

### `CURSOR_PROMPTS.md`
Ready-to-run Cursor Composer prompts — one per phase. **Always generated last.**

````markdown
# Cursor Build Prompts — [Project Name]

> One prompt per phase. Copy the entire block and paste into Cursor Composer.
> Do not modify it — if the spec needs changing, update the phase document first, then update this prompt.

---

## Phase [NN] — [Feature Name]

### Context files to read before writing any code
- `CLAUDE.md` — your operating contract for this codebase
- `.cursorrules` — code style, naming conventions, folder structure
- `PHASE_[NN]_[FEATURE_NAME].md` — full spec for this phase
- [Only docs relevant to this phase — not every document]

### What you are building
[2–3 sentences from the phase Overview, written as direct instruction]

### Files you will create or modify
[Drawn directly from Implementation Steps — exhaustive]
- `[path/to/file]` — [create / modify / extend]

### Boundaries — do not cross these
- Do not modify any file not listed above
- Do not implement anything in the Out of Scope section of `PHASE_[NN]_[FEATURE_NAME].md`
- Do not touch files from phases [XX, XX] unless this phase document explicitly says to
- Do not install new dependencies without flagging first

### When you finish building
1. Run `[exact test command]` — all tests must pass
2. Run `[exact integration test command if applicable]`
3. Work through the Manual Testing Checklist in `PHASE_[NN]_[FEATURE_NAME].md` item by item
4. Report back:
   - Which files were created or modified
   - Whether all automated tests passed (paste output)
   - Whether all manual checklist items passed
   - Anything that deviated from the spec, and why
5. Do not mark complete until every item in the Definition of Done is satisfied
6. Commit: `git commit -m "feat: phase [NN] — [feature name] complete"`

---
````

**Rules:**
- Context files list: include only docs relevant to this phase
- "Files to create or modify": exhaustive, drawn directly from phase Implementation Steps
- Boundaries: explicitly name which previous phase files are off-limits
- Test commands: exact commands from `ENV_AND_CONFIG.md` and phase doc
- Sub-phases (`04a`, `04b`): separate prompt block per sub-phase

> **Rule**: Generated last. If a phase document changes after planning, update the corresponding prompt before that phase begins.

---

## Phase 3 — AI Tooling Context Files

### `.cursorrules`
Cursor AI behavior rules for this project. Populate all `[placeholders]` from planning.

```
# [Project Name] — Cursor Rules

## Stack
- [Next.js 16 / Expo SDK 54 / Laravel / Node.js]
- CSS: Tailwind CSS (web only). Mobile uses React Native StyleSheet exclusively — no NativeWind.
- Database (dev): [local SQLite / Postgres / MySQL]
- Database (prod): [Supabase / AWS RDS]

## Code Style
- Language: TypeScript. Avoid `any` — type everything explicitly.
- Components: functional only, no class components
- Naming: PascalCase for components, camelCase for functions/vars, SCREAMING_SNAKE for env vars
- File naming: kebab-case for pages/routes, PascalCase for component files
- Imports: absolute from `@/` — never relative `../../`

## Folder Conventions
- Components: `src/components/[domain]/ComponentName.tsx`
- Hooks: `src/hooks/use-hook-name.ts`
- Utils: `src/lib/util-name.ts`
- Types: `src/types/domain.ts`
- API routes: `src/app/api/[route]/route.ts`
- Agent workers: `workers/agent-name/index.ts`

## What Cursor Should Always Do
- Add TypeScript types to every function parameter and return value
- Use Tailwind classes exclusively for styling (web)
- Wrap async operations in try/catch with structured error logging
- Follow dry-run pattern for agent code — see Agent & Worker Code below
- Route all LLM calls through `models.config.js` — never hardcode model names

## What Cursor Should Never Do
- Install a CSS library that isn't Tailwind
- Use `console.log` — use the project's structured logger
- Hardcode API keys, model names, or environment-specific URLs
- Create a new DB table without a migration file
- Use `any` as a TypeScript type
- Generate placeholder content in production code paths

## Agent & Worker Code
→ See Agent Safety Pattern in planning-templates.md (reproduced here for Cursor):
- Check killswitch: `if (process.env.AGENT_ENABLED !== 'true') return`
- Respect dry-run: wrap all writes in `if (!DRY_RUN)`
- Be idempotent: check for existing records before writing
- Use structured JSON logging
- Wrap external calls in retry logic with exponential backoff
- `process.exit(1)` on fatal error
- All LLM calls route through `models.config.js`

## Security Defaults
- Validate all input. Trust nothing from outside the system.
- Validate file uploads by MIME signature, not file extension.
- Never build auth from scratch — use Clerk, Auth0, Supabase Auth, or equivalent.
- Enable Row-Level Security from day one.
- Verify webhook signatures before processing.
- Separate test and production environments completely.

## Logging Standard
→ See Shared Patterns → Logging Standard

## Verification Checklist
Before saying you're done:
- [ ] Did you run it?
- [ ] Did you check the logs?
- [ ] Did you handle the error case?
- [ ] Is there a test?
- [ ] Would this survive a code review?

## What You Must Never Do
- Hardcode secrets, API keys, or credentials
- Fix symptoms instead of root causes
- Over-engineer a simple fix
- Make assumptions about state — check it
- Push schema changes without migrations
- Declare done without running the code

---

## Project-Specific Context

### What This Is
[One paragraph: what the project does, what problem it solves, who uses it]

### Stack
- Frontend: [Next.js 16 / Expo SDK 54 / none]
- Backend: [Node.js / Laravel / none]
- CSS: [Tailwind CSS (web) / React Native StyleSheet (mobile)]
- Database (dev): [local SQLite / Postgres / MySQL]
- Database (prod): [Supabase / AWS RDS]
- Agents: [PM2 on Mac Mini / none]
- LLM inference: [Ollama / Anthropic / OpenAI / Gemini / DeepSeek / mix]

### Project Structure
[Brief map of top-level directories]

### Key Commands
```bash
npm install
npm run dev
npm run db:migrate
npm run db:seed
npm run agent:dry-run   # if applicable
npm run agent:start     # if applicable
npm test
npm run test:integration
```

### Agent Patterns (if applicable)
- Model routing: all LLM calls through `models.config.js` with symbolic tiers
- Killswitch: `[AGENT_NAME]_ENABLED=false` stops execution immediately
- Dry-run: `DRY_RUN=true` runs full logic, skips all writes/sends/external calls
- All runs produce structured JSON log entries

### Project-Specific Rules
- Do not use Railway — agents run on Mac Mini via PM2
- Do not hardcode model names — use `models.config.js`
- Do not write to production DB during development
- Do not commit `.env` files
- [Add project-specific gotchas]

### Phase Status
- [ ] Phase 01 — [name]
- [ ] Phase 02 — [name]
[continue for all phases]

### Open Questions / Known Issues
[Anything unresolved Claude Code should know before making changes]
```

> **Rule**: Standard Rules Block (everything above Project-Specific Context) is never modified. Only the Project-Specific Context section changes between projects.
> **Rule**: Phase Status kept current — gives any cold Claude Code session an instant view of project state.

---

### `CLAUDE.md`
Claude Code project context file. Two sections: Standard Rules Block (never modify) + Project-Specific Block (populated per project).

```markdown
# CLAUDE.md

> Read this at the start of every session. This is your operating contract for this codebase.

---

## How You Work

You are a senior engineer. You write clean, minimal, production-quality code.
You fix root causes, not symptoms. You verify before declaring done.
You are autonomous — you don't ask for hand-holding on obvious problems.

---

## Before You Start Any Non-Trivial Task

1. State your plan before writing code. List the steps.
2. If something breaks mid-task — STOP. Re-plan. Don't keep pushing.
3. Ask yourself: *"Would a senior engineer approve this?"* If unsure, no.
4. Never mark a task complete without proof it works.

---

## Code Rules

- Simple beats clever. Future readers matter.
- One function, one responsibility. If you need "and" to describe it — split it.
- No magic numbers. Use named constants.
- No commented-out code. Delete it.
- No `console.log` / `var_dump` / debug output in production code.
- No inline SQL string interpolation. Parameterized queries always.
- No swallowed exceptions. Log with context or rethrow.
- No hardcoded secrets. Environment variables only.
- No schema changes without a migration file.
- No UI-level checks as a substitute for server-side authorization.

---

## Security Defaults

- Validate all input. Trust nothing from outside the system.
- Validate file uploads by MIME signature, not file extension.
- Never build auth from scratch. Use Clerk, Auth0, Supabase Auth, or equivalent.
- Enable Row-Level Security in the database from day one.
- Verify webhook signatures before processing any payload.
- Separate test and production environments completely.
- Never let webhooks or destructive scripts touch real data in test mode.

---

## Agent & Worker Code

→ See Shared Patterns → Agent Safety Pattern

---

## Logging Standard

→ See Shared Patterns → Logging Standard

---

## Verification Checklist

Before saying you're done:

- [ ] Did you run it?
- [ ] Did you check the logs?
- [ ] Did you handle the error case?
- [ ] Is there a test?
- [ ] Would this survive a code review?

---

## What You Must Never Do

- Hardcode secrets, API keys, or credentials
- Fix symptoms instead of root causes
- Over-engineer a simple fix
- Make assumptions about state — check it
- Push schema changes without migrations
- Declare done without running the code

---

## Project-Specific Context

> Everything below this line is project-specific. Populated during planning.

### What This Is
[One paragraph]

### Stack
- Frontend: [Next.js 16 / Expo SDK 54 / none]
- Backend: [Node.js / Laravel / none]
- CSS: [Tailwind CSS (web) / React Native StyleSheet (mobile)]
- Database (dev): [local SQLite / Postgres / MySQL]
- Database (prod): [Supabase / AWS RDS]
- Agents: [PM2 on Mac Mini / none]
- LLM inference: [Ollama / Anthropic / OpenAI / Gemini / DeepSeek / mix]

### Project Structure
[Brief map of top-level directories and what lives where]

### Key Commands
```bash
npm install
npm run dev
npm run db:migrate
npm run db:seed
npm run agent:dry-run
npm run agent:start
npm test
npm run test:integration
```

### Agent Patterns (if applicable)
- Model routing: all LLM calls through `models.config.js` with symbolic tiers (FAST, REASONING, CHEAP, LOCAL, MULTIMODAL)
- Every agent has a killswitch: `[AGENT_NAME]_ENABLED=false`
- Dry-run: `DRY_RUN=true` runs full logic, skips all writes/sends/external calls
- All runs produce structured JSON log entries

### Project-Specific Rules
- Do not use Railway — agents run on Mac Mini via PM2
- Do not hardcode model names — use `models.config.js`
- Do not write to production DB during development
- Do not commit `.env` files
- [Add any additional project-specific gotchas]

### Phase Status
- [ ] Phase 01 — [name]
- [ ] Phase 02 — [name]
[continue for all phases]

### Open Questions / Known Issues
[Anything unresolved]
```

---

### `AGENTS.md`
*(Produce only if the project includes autonomous agents)*
Multi-agent system registry and capability map.

```markdown
# [Project Name] — Agent Registry

## Overview
[One paragraph: what the agent system does collectively, what triggers it, what it produces]

## Agent Roster

### [Agent Name]
- **Role**: [What this agent is responsible for]
- **Trigger**: [cron / webhook / event / manual / spawned by another agent]
- **Input**: [Data received and from where]
- **Output**: [What it produces and where it sends it]
- **Tools / Permissions**:
  - [Tools, APIs, or system resources this agent can access]
  - [What it CANNOT access]
- **LLM Tier**: [FAST / REASONING / CHEAP / LOCAL / MULTIMODAL] — [provider] — [one-line rationale]
- **Human-in-the-loop**: [None / Telegram approval / Slack gate / etc.]
- **Dry-run behavior**: [What happens when DRY_RUN=true]
- **Killswitch**: `[AGENT_NAME]_ENABLED=false`
- **Worker file**: `workers/[agent-name]/index.ts`

## Agent Communication
[How agents talk to each other: shared DB, message queue, direct call, event emission]

## Shared Resources
[DB tables, queues, config files, or APIs that multiple agents access — concurrency concerns]

## Execution Environment
- Runtime: PM2 on Mac Mini
- Local inference: Ollama ([models in use])
- Process config: `ecosystem.config.js`
- Logs: `logs/[agent-name]/` — JSON format

## Safety Rules (apply to all agents)
→ See Shared Patterns → Agent Safety Pattern
- All agents must check `DRY_RUN` before any write, send, or external call
- All agents must check their own `[AGENT_NAME]_ENABLED` killswitch on startup
- No agent may write to another agent's output without explicit orchestration
- All LLM calls route through `models.config.js`
```

Populate all agents discovered during planning. Flag unclear roles or permissions as `[TBD]`.

---

### `SKILLS.md`
Reusable Cursor skill definitions for this project.

Format each skill as:

```markdown
## Skill: [Skill Name]
**Trigger phrase**: "[What you'd type to invoke this]"

**What this does**: [One sentence]

**Steps Cursor should follow**:
1. [Specific, ordered step]
2. [Specific, ordered step]

**Files typically touched**:
- `[path/to/file]` — [what changes]

**Rules**:
- [Any constraints or gotchas specific to this skill]
```

**Always include** (populate based on project stack):
- **Add a new database table** — migration file, schema definition, type export, seed entry if needed
- **Add a new API route** (if API exists) — route file, validation, error handling, type-safe response
- **Add a new UI component** (if frontend exists) — component file, Tailwind styling, state variants, export
- **Add a new agent worker** (if agents exist) — worker file, PM2 entry, dry-run gate, killswitch check, logging setup
- **Add a new LLM prompt** (if LLM pipeline exists) — prompt file or `PROMPTS.md` entry, model tier selection, output schema

**Add project-specific skills** for any pattern recurring more than twice. If a pattern will clearly repeat (e.g. "add a new writer persona," "add a new scoring dimension"), write a skill for it.

> **Note**: Flag any skill depending on a `[TBD]` decision — complete it before implementation begins.

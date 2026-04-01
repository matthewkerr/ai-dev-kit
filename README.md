# ai-dev-kit

A production-grade AI development toolkit for Cursor and Claude Code — built around a full indie/professional stack: Next.js, React Native, Laravel, Supabase, Node.js agents, and AWS.

Opinionated, generic enough to drop into anything, and built around one principle: **AI tools should work the way you think, not the other way around.**

---

## What's in here

```
ai-dev-kit/
├── skills/          Cursor MDC skill files — auto-loaded by glob or always-on
├── prompts/         Standalone AI prompts — paste into any model to drive workflows
├── lib/             Shared TypeScript infrastructure — copy into your projects
├── docs/            Reference schemas and specs (agent memory, LLM observability)
└── templates/       Fill-in-the-blank files — copy to your project root
```

> `examples/` is gitignored — it contains reference implementations specific to individual projects.

---

## Skills

Nine expert-grade `.mdc` skill files for Cursor. Each one enforces production conventions, provides full scaffolding with working code examples, and fires automatically on the right files via glob patterns.

### How to install

Copy the skill folders you need directly into your project's `.cursor/` directory:

```
your-project/
└── .cursor/
    └── skills/
        ├── typescript/skill.mdc        ← always install this one
        ├── nextjs-react/skill.mdc
        ├── supabase/skill.mdc
        └── ...
```

Or install globally in Cursor's settings to apply across all projects.

### Skill reference

| Skill | Fires on | Key coverage |
|---|---|---|
| **typescript** ⚡ | Everything (`alwaysApply: true`) | Strict tsconfig, ESLint flat config, Prettier, branded types, discriminated unions, Result pattern |
| **nextjs-react** | `app/**`, `components/**`, `middleware.ts` | App Router, async params (Next.js 15+), env validation, middleware, parallel routes, server actions |
| **react-native-expo** | `app.config.*`, `eas.json`, `screens/**` | Expo Router, offline-first, push notifications, deep linking, EAS build profiles, SDK pinning |
| **laravel-api** | `**/*.php`, `routes/**`, `app/Http/**` | Controller→Service→Action pattern, queues, events, caching, N+1 detection, Form Requests |
| **supabase** | `supabase/**`, `**/*.sql`, `migrations/**` | RLS patterns, pgvector/embeddings, storage, RPC functions, migration workflow, keep-alive |
| **ai-llm** | `prompts/**`, `ai/**`, `*prompt*.ts` | Model tier routing, structured outputs + Zod, RAG pipeline, cost tracking, evals, prompt caching |
| **skill** (agents) | `**/*agent*.{ts,js}`, `**/*worker*.{ts,js}` | AgentLoop base class, MCP server scaffold, streaming, multi-agent orchestration, PM2 |
| **testing** | `**/*.test.ts`, `e2e/**`, `phpunit.xml` | Vitest + Testing Library, Playwright with auth state, PHPUnit, factories, mock patterns |
| **security** | `auth/**`, `*auth*.ts`, `middleware.ts` | JWT verification, rate limiting, OWASP Top 10, input validation, privacy-first data design |

> ⚡ The `typescript` skill has `alwaysApply: true` — it loads on every file as a foundation layer. Install it in every project.

### Glob strategy

Skills are scoped so they don't double-load. `typescript` is always-on. Framework skills fire only on their relevant files. This means a Next.js project with Supabase will typically have 3–4 skills active at any point, not all nine.

---

## Prompts

Standalone markdown prompts — paste into Claude, ChatGPT, Gemini, or any capable model. Each one drives a specific workflow phase.

### Planning

A two-file system for structured project planning. Run these in Claude Opus (or any high-reasoning model) before you write a single line of code.

| File | Purpose |
|---|---|
| `prompts/Planning/planning-prompt.md` | System prompt — drives the full discovery and planning session. Paste as your first message. |
| `prompts/Planning/planning-templates.md` | Template library — all document formats and standard blocks. Paste when the model asks for it. |
| `prompts/Planning/PLANNING_SYSTEM_README.md` | Quick reference — how to run a planning session in 5 steps. |

The planning system produces a complete suite of planning documents: PROJECT_OVERVIEW, ARCHITECTURE, DATA_MODEL, API_SPEC, PHASE plans, and Cursor phase prompts you paste at the start of each build session.

### Brainstorming

`prompts/Brainstorming/brainstorm-prompt.md` — A divergent thinking partner session. Explores an idea across 8 lenses (problem, user, expansion, simplicity, differentiation, agent/automation, privacy, motivation) before converging into a structured Project Outline that feeds directly into the Planning Prompt.

### Agent Architect

`prompts/Agent Architect/agent-architect-system-prompt.md` — A system prompt that turns any capable model into an expert agent systems engineer. Covers model tier routing, architecture patterns (single/chain/parallel/hierarchical/loop), observability, deployment, and cost estimation. Use when designing or discussing agent systems.

### Build Prompts

Prompts to run at specific moments during active development:

| File | When to use |
|---|---|
| `prompts/Build Prompts/mid-build-checkin-prompt.md` | Deep in a phase and things aren't going how the spec said |
| `prompts/Build Prompts/phase-retrospective-prompt.md` | Immediately after completing a phase — before starting the next |
| `prompts/Build Prompts/pivot-replan-prompt.md` | Multiple phases in and something fundamental needs to change |

### Blocks

`prompts/blocks/constraints-formats.md` — Composable constraint sets and output format instructions. Mix and match with personas to build system prompts quickly: `json-only`, `no-hallucination`, `chain-of-thought`, `privacy-first`, `adversarial-robustness`, `confidence-calibrated`, and format shapes. Includes TypeScript composition examples.

---

## Lib

Shared TypeScript infrastructure. Copy into your project's `src/lib/` and they work immediately.

### `lib/loader.ts`

Runtime prompt registry. Prompts live as versioned markdown files rather than hardcoded strings. Exposes `loadPrompt()` and `buildPrompt()` — change a prompt by editing its `.md` file, no code change or redeploy needed.

**Prompt file format:**
```markdown
---
version: 1.0.0
description: What this prompt does
tier: FAST | REASONING | POWERFUL
maxTokens: 1024
temperature: 0.3
tags: [feature, project]
---

## System
Your system prompt here.

## User
Your user template with {{variable}} placeholders.
```

**Usage:**
```typescript
const prompt = await loadPrompt('my-feature');
const built  = buildPrompt(prompt, { variable: 'value' });

const response = await anthropic.messages.create({
  model:      built.model,
  max_tokens: built.maxTokens,
  system:     built.system,
  messages: [{ role: 'user', content: built.userMessage }],
});
```

### `lib/runner.ts`

Generic LLM eval runner. Takes typed test cases with named assertions, runs them, tracks pass rate, and exits with code 1 if pass rate drops below your threshold — works in CI.

```typescript
await runEvalSuite({
  suite:         'my-feature',
  promptVersion: prompt.meta.version,
  model:         prompt.meta.tier,
  cases:         MY_EVAL_CASES,
  threshold:     0.85, // fail if < 85% pass
  fn:            async (input) => myLLMFeature(input),
});
```

Run before any prompt change ships: `npx tsx evals/my-feature.eval.ts`

---

## Docs

Reference schemas you implement once per project.

### `docs/agent-memory.md`

Three-layer memory model for autonomous agents — episodic (what happened), semantic (what was learned), and working (current session). Includes:
- Supabase SQL schema (two tables, HNSW vector indexes, two RPC search functions)
- TypeScript interfaces for all three layers
- `agentMemory` client with `writeEpisode()`, `learnFact()`, `recallEpisodes()`, `recallKnowledge()`, `initWorkingMemory()`

### `docs/observability.md`

LLM observability layer. Includes:
- `llm_calls` Supabase table SQL — run once per project
- `logLLMCall()` TypeScript function — drop into `lib/llm-logger.ts`
- Cost calculation per model (Anthropic + OpenAI)
- 6 ready-to-run SQL queries: cost by feature, daily trend, error rate, prompt version comparison, p95 latency, monthly projection

---

## Templates

Copy these to your project root and fill in.

| File | What it does |
|---|---|
| `task-brief.md` | Fill in before every significant Cursor session — goal, scope, constraints, definition of done. The OUT OF SCOPE section stops Cursor from touching things you didn't ask about. |
| `CLAUDE.md` | Starter for your project-level AI context document — stack, conventions, model routing, what not to do. Copy to your project root and fill in over time. |
| `AGENTS.md` | Codex-compatible operating contract — working style, editing rules, code quality standards, safety constraints. Copy to your project root. |
| `cursorignore` | Prevents Cursor from indexing `node_modules`, build artifacts, binaries, and secrets. Rename to `.cursorignore` and drop in every project root. |
| `cursorrules` | Baseline `.cursorrules` starter — senior engineer conventions that apply to every file, every session. |

> The context files (`CLAUDE.md`, `AGENTS.md`) are the connective tissue that makes skills coherent across a project. They tell the AI who you are, what you're building, and what the non-negotiables are. Build them per project, seed them from the templates here.

---

## Philosophy

This toolkit exists because AI coding tools are only as good as the context you give them. Skills tell Cursor *how* to write code in each domain. The planning and brainstorm prompts replace the pre-build thinking you'd normally skip. The prompt registry, evals, and observability make LLM features reliable. The context docs tell the AI who you are and what you're building.

Built for indie developers and small teams who build real things without corporate scaffolding — privacy-first, no surveillance, no lock-in.

---

## Stack

The skills and patterns in this kit are built for:

- **Frontend** — Next.js (App Router), React Native + Expo
- **Backend** — Laravel (PHP 8.2+), Node.js
- **Database** — Supabase + PostgreSQL + pgvector
- **AI** — Anthropic Claude, OpenAI, Google Gemini, local models via Ollama
- **Infra** — AWS (EC2, S3, CodeDeploy), GitHub Actions
- **Agents** — Node.js + TypeScript, MCP, PM2

---

## Contributing

If a pattern is wrong, outdated, or missing — open an issue or PR. These skills are living documents; they should evolve as the stack evolves.

If you build a skill for a stack not covered here, PRs welcome.

---

## License

MIT — use freely, attribution appreciated but not required.

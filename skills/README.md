# Cursor Expert Skills Collection v2

Six expert-grade Cursor skill files (`.mdc`) covering a full modern web/mobile/backend/agent stack. Each skill enforces production conventions, provides full scaffolding, and is scoped to fire on the right files.

---

## Installation

Copy into your project at `.cursor/skills/`, or into your Cursor global skills directory for use across all projects:

```
your-project/
└── .cursor/
    └── skills/
        ├── nodejs-agents/skill.mdc
        ├── nextjs-react/skill.mdc
        ├── react-native-expo/skill.mdc
        ├── supabase/skill.mdc
        ├── laravel-api/skill.mdc
        └── typescript/skill.mdc     ← alwaysApply: true (foundation layer)
```

---

## Skills

### TypeScript / JS — Foundation Layer
`alwaysApply: true` — loads on every file as a baseline.
- Strict `tsconfig.json` with caveats for `noUncheckedIndexedAccess` and `moduleResolution: bundler`
- ESLint flat config (v9+) with `no-floating-promises`, `no-explicit-any`, `consistent-type-imports`
- Prettier config with `prettier-plugin-tailwindcss`
- Discriminated unions, `satisfies` operator, utility types reference
- **Branded types** — `UserId` vs `PostId` vs `string` — compiler-enforced ID safety
- Result pattern, custom error class hierarchy
- Async patterns: `Promise.all`, stream-and-collect, early returns
- Naming conventions, import order, function design rules

---

### Node.js Agents & Autonomous Systems
Fires on: `*agent*`, `*worker*`, `*pipeline*`, `agents/**`, `workers/**`, `mcp/**`
- `AgentLoop` base class — perceive → reason → act → remember
- Model routing via `models.config.ts` (FAST / REASONING / CHEAP / LOCAL / MULTIMODAL)
- Structured LLM calls with Zod validation; never parse LLM text manually
- **Streaming** — stream-and-collect vs pass-through `ReadableStream`
- **Multi-agent orchestration** — `OrchestratorAgent` / subagent pattern, typed `HandoffMessage`
- **MCP server scaffold** — `@modelcontextprotocol/sdk`, `ListTools` + `CallTool` handlers, stdio transport
- Tool registry with `zodToJsonSchema` (explicit import noted)
- Sliding window context memory + persistent `MemoryRecord` with pgvector support
- Retry + circuit breaker (both in `lib/`) + graceful shutdown
- Structured JSON logger + `CycleMetrics` interface
- **Full `ecosystem.config.js`** PM2 scaffold for production agents

---

### Next.js / React
Fires on: `app/**`, `components/**`, `pages/**`, `next.config.*`, `middleware.ts`
- App Router by default; Pages Router only if explicit
- **Next.js 15+**: `params` and `searchParams` are `Promise<...>` — always `await`
- **`cn()` setup** — `clsx` + `tailwind-merge` install + `lib/utils.ts`
- **Env validation** — `@t3-oss/env-nextjs` + Zod, validated at build time
- Server / client component decision rule + scaffolds for both
- Data layer with `cache()` deduplication, server actions with Zod, route handlers
- **Middleware** — auth guard + security headers pattern with correct `matcher`
- **Parallel routes** (`@modal` slot) + **intercepting routes** (modal-on-nav / page-on-direct)
- Compound components, error boundary, loading states
- Dynamic imports, `next/image` with blur placeholder

---

### React Native / Expo
Fires on: `app.json`, `app.config.*`, `eas.json`, `expo-plugins/**`, `screens/**`, `hooks/use*`
- Expo SDK + Expo Router (file-based) + TypeScript — no bare workflow
- Root layout with `GestureHandlerRootView`, `SafeAreaProvider`, `QueryClientProvider`
- Themed `ThemedText`, `Button` with variants, `StyleSheet.create()` everywhere
- React Query hooks with typed mutations
- **Offline-first** — `NetInfo` hook + optimistic updates with rollback
- **Push notifications** — `registerForPushNotifications`, token persistence, response-to-navigation
- **Deep linking** — `scheme`, `associatedDomains` (iOS), `intentFilters` (Android), Expo Linking
- **Full `eas.json`** — development/preview/production profiles + submit config
- EAS build/submit/update CLI commands
- **SDK version pinning** — pin `expo`, `react`, `react-native` exact, never `^`
- Accessibility props on all interactive elements
- `expo-image` for remote images, `FlashList` for long lists

---

### Supabase
Fires on: `supabase/**`, `**/*.sql`, `migrations/**`, `functions/**`, `supabase/config.toml`
- Table conventions: UUID PKs, `updated_at` trigger, indexes on every FK
- RLS: user-owned, public-read, role-based, service role bypass
- RLS anti-patterns: no `IN`, no `USING (true)`, no `DISABLE ROW LEVEL SECURITY`
- Typed client setup: `@supabase/ssr` browser + server clients for Next.js
- **pgvector** — extension, HNSW index, `embed()`, `upsertWithEmbedding()`, `semanticSearch()` via RPC
- **Storage** — `uploadFile`, `getSignedUrl`, `getPublicUrl`, storage RLS policies
- **Database RPC** — `supabase.rpc()`, `SECURITY DEFINER` vs `SECURITY INVOKER`
- Realtime subscriptions with cleanup
- Auth middleware for Next.js
- **Migration workflow** — `supabase migration new`, `db push`, `db diff`, `db reset`, `gen types`
- **Free-tier keep-alive** worker (PM2, pings every 4 days)

---

### Laravel API
Fires on: `**/*.php`, `routes/**`, `app/Http/**`, `app/Models/**`, `database/**`, `tests/**`
- `declare(strict_types=1)` + PHP 8.2+ minimum — enforced everywhere
- Controller → Service → Action pattern; no business logic in controllers
- Form Requests with JSON validation error responses
- API Resources with `when()` / `whenLoaded()` for conditional fields
- **Jobs & Queues** — `ShouldQueue` scaffold with `$tries`, `$backoff`, `failed()` callback
- **Events & Listeners** — `EventServiceProvider` wiring, fully decoupled
- **Caching** — `Cache::remember`, tags (Redis), forever + manual invalidation; always invalidate on write
- **Action classes** — single-purpose, invokable, transaction-wrapped
- **N+1 detection** — `preventLazyLoading()` in local env, eager-load rules
- Policy scaffold, feature test scaffold
- API versioning from day one: `/api/v1/`
- Sanctum for auth; Passport only for OAuth server use cases

---

## Glob Strategy

| Skill | Strategy | Rationale |
|---|---|---|
| TypeScript | `alwaysApply: true`, no globs | Foundation layer — every file benefits |
| Next.js | `app/**`, `components/**`, specific files | Avoids double-loading with TS skill |
| React Native | `app.json`, `eas.json`, `screens/**` | Avoids firing on web Next.js files in monorepos |
| Node.js Agents | `*agent*`, `agents/**`, `mcp/**` | Tight to agent/worker/MCP files only |
| Supabase | `supabase/**`, `*.sql`, `migrations/**` | DB and function files only |
| Laravel | `**/*.php`, framework dirs | PHP files — no overlap with JS skills |

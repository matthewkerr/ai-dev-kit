<!--
FILE: docs/observability.md
PURPOSE: LLM call logging schema and query reference. Defines the llm_calls Supabase
         table (run the SQL once per project), a drop-in logLLMCall() TypeScript
         function for lib/llm-logger.ts, cost calculation per model, and 6 pre-written
         SQL queries for: cost by feature, daily cost trend, error rate, prompt version
         comparison, p95 latency, and monthly cost projection.
USED BY: Any project making LLM calls. Import logLLMCall() and call it after every
         Anthropic/OpenAI response. Answers "what did this cost this week" and
         "which prompt version performs best" without digging through logs.
RUN SQL IN: Supabase SQL Editor — once per project.
UPDATE: COST_PER_1M pricing map when model pricing changes.
-->

---
# LLM Observability — Log Schema & Query Reference

Every LLM call across all projects writes a structured record.
This document defines the schema, the Supabase table, and the queries
you'll actually run to understand cost, quality, and usage.

---

## Supabase Table

```sql
CREATE TABLE llm_calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Identity
  project         TEXT NOT NULL,                    -- 'my-app' | 'my-api' | 'my-agent'
  feature         TEXT NOT NULL,                    -- 'card-reading' | 'signal-extraction'
  prompt_version  TEXT NOT NULL,                    -- '2.1.0'
  session_id      TEXT,                             -- groups calls in one user session

  -- Model
  model           TEXT NOT NULL,                    -- 'claude-sonnet-4-6'
  tier            TEXT NOT NULL,                    -- 'FAST' | 'REASONING' | 'POWERFUL'

  -- Usage
  input_tokens    INTEGER NOT NULL,
  output_tokens   INTEGER NOT NULL,
  total_tokens    INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_usd        NUMERIC(10, 6) NOT NULL,          -- calculated at call time
  latency_ms      INTEGER NOT NULL,

  -- Quality
  success         BOOLEAN NOT NULL DEFAULT true,
  stop_reason     TEXT,                             -- 'end_turn' | 'max_tokens' | 'error'
  error_type      TEXT,                             -- null on success

  -- Context (optional — add what's useful per feature)
  metadata        JSONB DEFAULT '{}'::jsonb         -- feature-specific data
);

-- Indexes for common queries
CREATE INDEX idx_llm_calls_project     ON llm_calls(project);
CREATE INDEX idx_llm_calls_feature     ON llm_calls(feature);
CREATE INDEX idx_llm_calls_created_at  ON llm_calls(created_at DESC);
CREATE INDEX idx_llm_calls_model       ON llm_calls(model);

-- RLS — service role only (never expose raw LLM logs to users)
ALTER TABLE llm_calls ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — access via service role key or Edge Functions only
```

---

## TypeScript Logger

```typescript
// lib/llm-logger.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cost per 1M tokens — update when pricing changes
const COST_PER_1M: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.80,  output: 4.00  },
  'claude-sonnet-4-6':          { input: 3.00,  output: 15.00 },
  'claude-opus-4-6':            { input: 15.00, output: 75.00 },
  'gpt-4o':                     { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':                { input: 0.15,  output: 0.60  },
  'text-embedding-3-small':     { input: 0.02,  output: 0     },
};

export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_PER_1M[model] ?? { input: 0, output: 0 };
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

export interface LLMCallLog {
  project:       string;
  feature:       string;
  promptVersion: string;
  sessionId?:    string;
  model:         string;
  tier:          string;
  inputTokens:   number;
  outputTokens:  number;
  latencyMs:     number;
  success:       boolean;
  stopReason?:   string;
  errorType?:    string;
  metadata?:     Record<string, unknown>;
}

export async function logLLMCall(call: LLMCallLog): Promise<void> {
  const costUsd = calcCost(call.model, call.inputTokens, call.outputTokens);

  const { error } = await supabase.from('llm_calls').insert({
    project:        call.project,
    feature:        call.feature,
    prompt_version: call.promptVersion,
    session_id:     call.sessionId,
    model:          call.model,
    tier:           call.tier,
    input_tokens:   call.inputTokens,
    output_tokens:  call.outputTokens,
    cost_usd:       costUsd,
    latency_ms:     call.latencyMs,
    success:        call.success,
    stop_reason:    call.stopReason,
    error_type:     call.errorType,
    metadata:       call.metadata ?? {},
  });

  if (error) {
    // Log failure is non-fatal — never crash on observability
    console.warn('[llm-logger] Failed to log call:', error.message);
  }
}
```

---

## Useful Queries

### Cost this week by feature
```sql
SELECT
  feature,
  count(*) as calls,
  sum(total_tokens) as total_tokens,
  round(sum(cost_usd)::numeric, 4) as total_cost_usd
FROM llm_calls
WHERE created_at > now() - interval '7 days'
  AND project = 'my-app'
GROUP BY feature
ORDER BY total_cost_usd DESC;
```

### Daily cost trend (last 30 days)
```sql
SELECT
  date_trunc('day', created_at) as day,
  count(*) as calls,
  round(sum(cost_usd)::numeric, 4) as cost_usd
FROM llm_calls
WHERE created_at > now() - interval '30 days'
GROUP BY day
ORDER BY day;
```

### Error rate by feature
```sql
SELECT
  feature,
  count(*) as total,
  count(*) FILTER (WHERE NOT success) as errors,
  round(100.0 * count(*) FILTER (WHERE NOT success) / count(*), 1) as error_pct
FROM llm_calls
WHERE created_at > now() - interval '7 days'
GROUP BY feature
HAVING count(*) > 10
ORDER BY error_pct DESC;
```

### Prompt version comparison (quality proxy: latency + stop_reason)
```sql
SELECT
  prompt_version,
  count(*) as calls,
  round(avg(latency_ms)) as avg_latency_ms,
  round(avg(output_tokens)) as avg_output_tokens,
  count(*) FILTER (WHERE stop_reason = 'max_tokens') as hit_max_tokens,
  count(*) FILTER (WHERE NOT success) as errors
FROM llm_calls
WHERE feature = 'card-reading'
  AND created_at > now() - interval '30 days'
GROUP BY prompt_version
ORDER BY prompt_version DESC;
```

### Slowest calls (p95 latency)
```sql
SELECT
  feature,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_ms,
  percentile_cont(0.50) WITHIN GROUP (ORDER BY latency_ms) as p50_ms,
  max(latency_ms) as max_ms
FROM llm_calls
WHERE created_at > now() - interval '7 days'
GROUP BY feature
ORDER BY p95_ms DESC;
```

### Monthly cost projection
```sql
WITH daily AS (
  SELECT sum(cost_usd) as day_cost
  FROM llm_calls
  WHERE created_at > now() - interval '7 days'
  GROUP BY date_trunc('day', created_at)
)
SELECT
  round(avg(day_cost)::numeric, 4) as avg_daily_usd,
  round((avg(day_cost) * 30)::numeric, 2) as projected_monthly_usd
FROM daily;
```

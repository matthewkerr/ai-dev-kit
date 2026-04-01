<!--
FILE: docs/agent-memory.md
PURPOSE: Formal schema for three-layer agent memory — episodic (what happened),
         semantic (what was learned), and working (current session context).
         Contains Supabase SQL to run once (two tables, indexes, two RPC functions),
         TypeScript interfaces for all three memory types, and a ready-to-use
         agentMemory client with writeEpisode(), learnFact(), recallEpisodes(),
         recallKnowledge(), and initWorkingMemory().
APPLIES TO: Any agent with persistent state. Replaces ad-hoc memory implementations
            across projects with a single unified pattern backed by pgvector.
RUN SQL IN: Supabase SQL Editor — once per project that uses agents.
-->

---
# Agent Memory Schema

Three-layer memory model for autonomous agents.
Implemented in Supabase with pgvector for semantic retrieval.

## Layers

| Layer | What it stores | Retention | Retrieval |
|---|---|---|---|
| Episodic | What happened in past cycles/sessions | Configurable | By time, agent, session |
| Semantic | Facts, patterns, learned knowledge | Permanent | By embedding similarity |
| Working | Current session context window | Session only | In-memory, not persisted |

---

## SQL Schema

```sql
-- Enable pgvector (once per project)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Episodic Memory ─────────────────────────────────────────────────────────
-- What the agent did and what happened as a result.
-- The agent's autobiography.

CREATE TABLE agent_episodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  agent_id      TEXT NOT NULL,          -- which agent
  session_id    TEXT NOT NULL,          -- groups a run
  iteration     INTEGER NOT NULL,       -- cycle number within session
  project       TEXT NOT NULL,          -- 'my-project' | 'my-other-project' | etc.

  -- What happened
  perception    JSONB NOT NULL,         -- what the agent saw (input)
  decision      JSONB NOT NULL,         -- what it decided
  action_taken  TEXT NOT NULL,          -- human-readable description
  outcome       TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial', 'skipped')),

  -- Performance
  duration_ms   INTEGER NOT NULL,
  llm_calls     INTEGER NOT NULL DEFAULT 0,
  tokens_used   INTEGER NOT NULL DEFAULT 0,
  cost_usd      NUMERIC(10, 6) NOT NULL DEFAULT 0,

  -- For retrieval
  summary       TEXT,                   -- 1-2 sentence human-readable summary
  tags          TEXT[] NOT NULL DEFAULT '{}',
  embedding     vector(1536),           -- embed the summary for semantic search

  -- Retention
  expires_at    TIMESTAMPTZ,            -- null = keep forever
  important     BOOLEAN NOT NULL DEFAULT false  -- never auto-expire if true
);

CREATE INDEX idx_episodes_agent_id    ON agent_episodes(agent_id);
CREATE INDEX idx_episodes_session_id  ON agent_episodes(session_id);
CREATE INDEX idx_episodes_created_at  ON agent_episodes(created_at DESC);
CREATE INDEX idx_episodes_project     ON agent_episodes(project);
CREATE INDEX idx_episodes_embedding   ON agent_episodes USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- Auto-expire old episodes (run via pg_cron or a scheduled function)
-- DELETE FROM agent_episodes WHERE expires_at IS NOT NULL AND expires_at < now() AND NOT important;


-- ─── Semantic Memory ─────────────────────────────────────────────────────────
-- Facts, patterns, and learned knowledge the agent has extracted.
-- The agent's knowledge base — what it "knows" vs what it "did".

CREATE TABLE agent_knowledge (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  agent_id      TEXT NOT NULL,
  project       TEXT NOT NULL,

  -- The knowledge
  content       TEXT NOT NULL,          -- the fact or pattern, in plain text
  category      TEXT NOT NULL,          -- 'pattern' | 'fact' | 'rule' | 'observation'
  confidence    NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),

  -- Provenance
  source_episode_ids UUID[],            -- which episodes led to this knowledge
  evidence_count INTEGER NOT NULL DEFAULT 1,  -- how many times confirmed

  -- Retrieval
  tags          TEXT[] NOT NULL DEFAULT '{}',
  embedding     vector(1536) NOT NULL,

  -- Lifecycle
  superseded_by UUID REFERENCES agent_knowledge(id),  -- if this knowledge was updated
  active        BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_knowledge_agent_id  ON agent_knowledge(agent_id);
CREATE INDEX idx_knowledge_project   ON agent_knowledge(project);
CREATE INDEX idx_knowledge_active    ON agent_knowledge(active) WHERE active = true;
CREATE INDEX idx_knowledge_embedding ON agent_knowledge USING hnsw (embedding vector_cosine_ops);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER agent_knowledge_updated_at
  BEFORE UPDATE ON agent_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─── RPC: Semantic Retrieval ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION search_agent_episodes(
  p_agent_id TEXT,
  p_query_embedding vector,
  p_limit INT DEFAULT 5,
  p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (id UUID, summary TEXT, outcome TEXT, created_at TIMESTAMPTZ, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT id, summary, outcome, created_at,
         1 - (embedding <=> p_query_embedding) AS similarity
  FROM agent_episodes
  WHERE agent_id = p_agent_id
    AND embedding IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION search_agent_knowledge(
  p_agent_id TEXT,
  p_query_embedding vector,
  p_limit INT DEFAULT 5,
  p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (id UUID, content TEXT, category TEXT, confidence NUMERIC, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT id, content, category, confidence,
         1 - (embedding <=> p_query_embedding) AS similarity
  FROM agent_knowledge
  WHERE agent_id = p_agent_id
    AND active = true
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_limit;
$$;
```

---

## TypeScript Interfaces

```typescript
// lib/agent-memory.ts

export interface EpisodicMemory {
  id: string;
  agentId: string;
  sessionId: string;
  iteration: number;
  project: string;
  perception: unknown;
  decision: unknown;
  actionTaken: string;
  outcome: 'success' | 'failure' | 'partial' | 'skipped';
  durationMs: number;
  llmCalls: number;
  tokensUsed: number;
  costUsd: number;
  summary?: string;
  tags: string[];
  embedding?: number[];
  expiresAt?: Date;
  important: boolean;
  createdAt: Date;
}

export interface SemanticMemory {
  id: string;
  agentId: string;
  project: string;
  content: string;
  category: 'pattern' | 'fact' | 'rule' | 'observation';
  confidence: number;        // 0–1
  sourceEpisodeIds: string[];
  evidenceCount: number;
  tags: string[];
  embedding: number[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Working memory — in-process only, not persisted
export interface WorkingMemory {
  sessionId: string;
  agentId: string;
  startedAt: Date;
  iteration: number;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextTokens: number;     // running estimate
  maxContextTokens: number;  // threshold to trigger pruning
  recentEpisodes: EpisodicMemory[];   // last N episodes loaded at session start
  relevantKnowledge: SemanticMemory[]; // retrieved at session start
}
```

## Memory Client

```typescript
// lib/agent-memory-client.ts
import { createClient } from '@supabase/supabase-js';
import { embed } from '@/lib/embeddings';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const agentMemory = {

  // Write a completed episode
  async writeEpisode(episode: Omit<EpisodicMemory, 'id' | 'createdAt' | 'embedding'>): Promise<string> {
    const embedding = episode.summary ? await embed(episode.summary) : null;

    const { data, error } = await supabase.from('agent_episodes').insert({
      agent_id:         episode.agentId,
      session_id:       episode.sessionId,
      iteration:        episode.iteration,
      project:          episode.project,
      perception:       episode.perception,
      decision:         episode.decision,
      action_taken:     episode.actionTaken,
      outcome:          episode.outcome,
      duration_ms:      episode.durationMs,
      llm_calls:        episode.llmCalls,
      tokens_used:      episode.tokensUsed,
      cost_usd:         episode.costUsd,
      summary:          episode.summary,
      tags:             episode.tags,
      embedding:        embedding ? JSON.stringify(embedding) : null,
      expires_at:       episode.expiresAt?.toISOString(),
      important:        episode.important,
    }).select('id').single();

    if (error) throw error;
    return data.id;
  },

  // Retrieve episodes similar to a query
  async recallEpisodes(agentId: string, query: string, limit = 5) {
    const embedding = await embed(query);
    const { data, error } = await supabase.rpc('search_agent_episodes', {
      p_agent_id:        agentId,
      p_query_embedding: embedding,
      p_limit:           limit,
    });
    if (error) throw error;
    return data;
  },

  // Store a learned fact or pattern
  async learnFact(fact: Omit<SemanticMemory, 'id' | 'createdAt' | 'updatedAt' | 'embedding' | 'active'>) {
    const embedding = await embed(fact.content);
    const { error } = await supabase.from('agent_knowledge').insert({
      agent_id:           fact.agentId,
      project:            fact.project,
      content:            fact.content,
      category:           fact.category,
      confidence:         fact.confidence,
      source_episode_ids: fact.sourceEpisodeIds,
      evidence_count:     fact.evidenceCount,
      tags:               fact.tags,
      embedding:          JSON.stringify(embedding),
    });
    if (error) throw error;
  },

  // Retrieve relevant knowledge for current context
  async recallKnowledge(agentId: string, query: string, limit = 5) {
    const embedding = await embed(query);
    const { data, error } = await supabase.rpc('search_agent_knowledge', {
      p_agent_id:        agentId,
      p_query_embedding: embedding,
      p_limit:           limit,
    });
    if (error) throw error;
    return data;
  },

  // Load working memory at session start
  async initWorkingMemory(agentId: string, sessionId: string, contextQuery: string): Promise<WorkingMemory> {
    const [recentEpisodes, relevantKnowledge] = await Promise.all([
      supabase.from('agent_episodes')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10)
        .then(r => r.data ?? []),
      this.recallKnowledge(agentId, contextQuery, 8),
    ]);

    return {
      sessionId,
      agentId,
      startedAt: new Date(),
      iteration: 0,
      messages: [],
      contextTokens: 0,
      maxContextTokens: 8000,
      recentEpisodes:   recentEpisodes as EpisodicMemory[],
      relevantKnowledge: relevantKnowledge as SemanticMemory[],
    };
  },
};
```

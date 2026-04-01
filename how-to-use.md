ai-dev-kit/
├── README.md — how to use this repo, install instructions
├── CHANGELOG.md — what changed and when
└── .cursorignore — copy to any project root

Cursor Skills — copy .cursor/skills/ into any project

├── skills/
│ ├── README.md — glob strategy, install instructions
│ ├── foundation/
│ │ └── typescript/skill.mdc — alwaysApply:true, loaded on everything
│ ├── frontend/
│ │ ├── nextjs-react/skill.mdc
│ │ └── react-native-expo/skill.mdc
│ ├── backend/
│ │ └── laravel-api/skill.mdc
│ ├── infra/
│ │ ├── aws-devops/skill.mdc
│ │ └── supabase/skill.mdc
│ ├── ai/
│ │ ├── nodejs-agents/skill.mdc
│ │ └── ai-llm/skill.mdc
│ └── quality/
│ ├── testing/skill.mdc
│ └── security/skill.mdc

Shared Library — copy relevant files into project src/
├── lib/
│ ├── prompts/ — prompt registry system
│ │ ├── loader.ts — runtime loader, copy to project lib/prompts/
│ │ ├── blocks/constraints-formats.md — composable prompt components
│ │ └── personas/personas.md — reusable role definitions
│ ├── evals/ — LLM eval engine
│ │ └── runner.ts — generic runner, copy to project evals/
│ └── observability/
│ └── llm-logger.ts — copy to project lib/, log every LLM call

Examples — real implementations to copy and adapt
├── examples/
│ ├── prompts/ — feature prompt files showing the format
│ │ ├── card-reading.md — example tarot reading prompt (REASONING tier)
│ │ └── signal-extraction.md — example signal extraction prompt (FAST tier)
│ └── evals/ — eval suites showing the pattern
│ └── card-reading.eval.ts — 5 cases, 20 assertions, 85% threshold

Reference Docs — schemas, specs, and queries
├── docs/
│ ├── agent-memory.md — SQL schema + TS client for 3-layer agent memory
│ └── observability.md — llm_calls table SQL + 6 useful queries


Templates — copy to project root, fill in per project
└── templates/
├── task-brief.md — fill before every significant Cursor session
├── .cursorignore — drop in every project root
├── CLAUDE.md.template — starter for project-level AI context doc
├── decisions.md.template — ADR log starter
└── mistakes.md.template — self-learning log starter
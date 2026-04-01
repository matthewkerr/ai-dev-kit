// /**
//  * FILE: prompts/loader.ts
//  * PURPOSE: Runtime loader for the prompt registry. Reads versioned prompt files from
//  *          prompts/features/*.md, parses their frontmatter metadata and content sections,
//  *          and exposes loadPrompt() / buildPrompt() for use in any LLM call site.
//  *          Change a prompt by editing its .md file — no code change or redeploy needed.
//  * USED BY: Any file that makes an LLM call — agents, API routes, edge functions.
//  * DEPENDS ON: prompts/features/*.md, lib/models.config.ts
//  */

// /**
//  * Prompt Registry Loader
//  *
//  * Loads versioned prompts from the prompts/ directory at runtime.
//  * Prompts are markdown files with YAML frontmatter for metadata.
//  *
//  * Usage:
//  *   const prompt = await loadPrompt('card-reading');
//  *   const system = buildPrompt(prompt, { card: 'The Tower', tier: 'REASONING' });
//  */

// import { readFileSync, readdirSync } from 'fs';
// import { join } from 'path';
// import { MODELS, type ModelTier } from '@/lib/models.config';

// // ─── Types ───────────────────────────────────────────────────────────────────

// export interface PromptMeta {
//   id: string;
//   version: string;
//   description: string;
//   tier: ModelTier;         // default model tier for this prompt
//   maxTokens: number;       // recommended max_tokens for output
//   temperature: number;     // recommended temperature
//   lastEvalScore?: number;  // 0–1, updated after eval runs
//   lastEvalDate?: string;   // ISO date
//   deprecated?: boolean;    // if true, warn on load
//   tags: string[];          // searchable labels
// }

// export interface Prompt {
//   meta: PromptMeta;
//   system: string;          // system prompt content
//   userTemplate: string;    // user message template — use {{variable}} placeholders
// }

// export interface BuiltPrompt {
//   model: string;
//   system: string;
//   userMessage: string;
//   maxTokens: number;
//   temperature: number;
// }

// // ─── Registry ────────────────────────────────────────────────────────────────

// const PROMPTS_DIR = join(process.cwd(), 'prompts');
// const cache = new Map<string, Prompt>();

// /**
//  * Load a prompt by ID. Cached after first load.
//  * Prompts live in prompts/features/{id}.md
//  */
// export async function loadPrompt(id: string): Promise<Prompt> {
//   if (cache.has(id)) return cache.get(id)!;

//   const filePath = join(PROMPTS_DIR, 'features', `${id}.md`);

//   let raw: string;
//   try {
//     raw = readFileSync(filePath, 'utf-8');
//   } catch {
//     throw new Error(`Prompt not found: "${id}" — expected at ${filePath}`);
//   }

//   const prompt = parsePromptFile(raw, id);

//   if (prompt.meta.deprecated) {
//     console.warn(`[prompts] Warning: prompt "${id}" is deprecated. Check for a replacement.`);
//   }

//   cache.set(id, prompt);
//   return prompt;
// }

// /**
//  * Build a complete prompt with variable substitution.
//  * Replaces {{variable}} placeholders in the userTemplate.
//  */
// export function buildPrompt(
//   prompt: Prompt,
//   variables: Record<string, string>,
//   overrides: Partial<{ tier: ModelTier; maxTokens: number; temperature: number }> = {}
// ): BuiltPrompt {
//   let userMessage = prompt.userTemplate;

//   // Replace all {{variable}} placeholders
//   for (const [key, value] of Object.entries(variables)) {
//     userMessage = userMessage.replaceAll(`{{${key}}}`, value);
//   }

//   // Warn on unresolved placeholders
//   const unresolved = userMessage.match(/\{\{[^}]+\}\}/g);
//   if (unresolved) {
//     console.warn(`[prompts] Unresolved placeholders in "${prompt.meta.id}":`, unresolved);
//   }

//   const tier = overrides.tier ?? prompt.meta.tier;

//   return {
//     model:       MODELS[tier],
//     system:      prompt.system,
//     userMessage,
//     maxTokens:   overrides.maxTokens  ?? prompt.meta.maxTokens,
//     temperature: overrides.temperature ?? prompt.meta.temperature,
//   };
// }

// /**
//  * List all available prompts with their metadata.
//  */
// export function listPrompts(): PromptMeta[] {
//   const featuresDir = join(PROMPTS_DIR, 'features');
//   const files = readdirSync(featuresDir).filter(f => f.endsWith('.md'));

//   return files.map(file => {
//     const id = file.replace('.md', '');
//     const prompt = cache.get(id) ?? parsePromptFile(
//       readFileSync(join(featuresDir, file), 'utf-8'),
//       id
//     );
//     return prompt.meta;
//   });
// }

// // ─── Parser ──────────────────────────────────────────────────────────────────

// function parsePromptFile(raw: string, id: string): Prompt {
//   // Split frontmatter from content
//   const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
//   if (!match) throw new Error(`Prompt "${id}" is missing YAML frontmatter`);

//   const [, frontmatter, body] = match;
//   const meta = parseFrontmatter(frontmatter, id);

//   // Split body into system and user sections
//   const systemMatch = body.match(/## system\n([\s\S]*?)(?=## user|$)/i);
//   const userMatch   = body.match(/## user\n([\s\S]*?)$/i);

//   if (!systemMatch) throw new Error(`Prompt "${id}" is missing a ## System section`);
//   if (!userMatch)   throw new Error(`Prompt "${id}" is missing a ## User section`);

//   return {
//     meta,
//     system:       systemMatch[1].trim(),
//     userTemplate: userMatch[1].trim(),
//   };
// }

// function parseFrontmatter(yaml: string, id: string): PromptMeta {
//   const get = (key: string) => yaml.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim();
//   const getNum = (key: string, fallback: number) => parseFloat(get(key) ?? String(fallback));

//   const tags = yaml.match(/^tags:\s*\[([^\]]+)\]/m)?.[1]
//     ?.split(',').map(t => t.trim().replace(/['"]/g, '')) ?? [];

//   return {
//     id,
//     version:       get('version')     ?? '1.0.0',
//     description:   get('description') ?? '',
//     tier:          (get('tier')       ?? 'FAST') as ModelTier,
//     maxTokens:     getNum('maxTokens', 1024),
//     temperature:   getNum('temperature', 0.3),
//     lastEvalScore: get('lastEvalScore') ? getNum('lastEvalScore', 0) : undefined,
//     lastEvalDate:  get('lastEvalDate'),
//     deprecated:    get('deprecated') === 'true',
//     tags,
//   };
// }

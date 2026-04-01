/**
 * FILE: evals/runner.ts
 * PURPOSE: Generic eval engine for LLM features. Takes a suite of test cases with
 *          typed assertions, runs them against any async function, reports pass/fail
 *          per case, persists run history to evals/results/{suite}.json, and exits
 *          with code 1 if pass rate drops below the configured threshold.
 *          Run in CI before any prompt change ships to catch regressions early.
 * USED BY: evals/*.eval.ts — one eval file per LLM feature.
 * ADD NEW SUITES: Copy an existing *.eval.ts, swap the cases and fn, done.
 */

/**
 * LLM Eval Runner
 *
 * Runs structured eval suites against LLM features.
 * Track pass rates over time to detect prompt regressions.
 *
 * Usage:
 *   npx tsx evals/runner.ts --suite card-reading
 *   npx tsx evals/runner.ts --suite all --threshold 0.80
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EvalCase<TInput = unknown, TOutput = unknown> {
  id: string;
  description: string;
  input: TInput;
  /** Optional: exact expected output (strict equality) */
  expected?: Partial<TOutput>;
  /** Semantic assertions — return true to pass, false to fail */
  assertions: Array<{
    name: string;
    fn: (output: TOutput) => boolean;
  }>;
}

export interface EvalResult {
  caseId: string;
  description: string;
  passed: boolean;
  failedAssertions: string[];
  output: unknown;
  latencyMs: number;
  error?: string;
}

export interface EvalRun {
  suite: string;
  promptVersion: string;
  model: string;
  timestamp: string;
  passRate: number;
  passed: number;
  failed: number;
  total: number;
  results: EvalResult[];
}

// ─── Runner ──────────────────────────────────────────────────────────────────

export async function runEvalSuite<TInput, TOutput>(opts: {
  suite: string;
  promptVersion: string;
  model: string;
  cases: EvalCase<TInput, TOutput>[];
  /** The function under test — takes input, returns output */
  fn: (input: TInput) => Promise<TOutput>;
  /** Fail the run if pass rate drops below this threshold (default: 0.80) */
  threshold?: number;
  /** Write results to evals/results/{suite}.json */
  persist?: boolean;
}): Promise<EvalRun> {
  const { suite, promptVersion, model, cases, fn, threshold = 0.80, persist = true } = opts;

  console.log(`\n[eval] Running suite: ${suite} (${cases.length} cases)\n`);

  const results: EvalResult[] = [];

  for (const evalCase of cases) {
    const start = Date.now();
    let output: TOutput | undefined;
    let error: string | undefined;
    const failedAssertions: string[] = [];

    try {
      output = await fn(evalCase.input);

      // Run assertions
      for (const assertion of evalCase.assertions) {
        try {
          const passed = assertion.fn(output);
          if (!passed) failedAssertions.push(assertion.name);
        } catch (e) {
          failedAssertions.push(`${assertion.name} (threw: ${String(e)})`);
        }
      }

      // Check expected fields if provided
      if (evalCase.expected && output) {
        for (const [key, val] of Object.entries(evalCase.expected)) {
          const actual = (output as Record<string, unknown>)[key];
          if (actual !== val) {
            failedAssertions.push(`expected.${key}: got ${JSON.stringify(actual)}, want ${JSON.stringify(val)}`);
          }
        }
      }
    } catch (e) {
      error = String(e);
    }

    const passed = !error && failedAssertions.length === 0;
    const latencyMs = Date.now() - start;

    const icon = passed ? '✓' : '✗';
    console.log(`  ${icon} [${evalCase.id}] ${evalCase.description} (${latencyMs}ms)`);
    if (!passed) {
      if (error) console.log(`    Error: ${error}`);
      failedAssertions.forEach(a => console.log(`    Failed: ${a}`));
    }

    results.push({
      caseId: evalCase.id,
      description: evalCase.description,
      passed,
      failedAssertions,
      output: output ?? null,
      latencyMs,
      error,
    });
  }

  const passed  = results.filter(r => r.passed).length;
  const failed  = results.length - passed;
  const passRate = passed / results.length;

  const run: EvalRun = {
    suite,
    promptVersion,
    model,
    timestamp: new Date().toISOString(),
    passRate,
    passed,
    failed,
    total: results.length,
    results,
  };

  console.log(`\n[eval] Results: ${passed}/${results.length} passed (${(passRate * 100).toFixed(1)}%)`);
  console.log(`[eval] Threshold: ${(threshold * 100).toFixed(0)}% — ${passRate >= threshold ? 'PASS' : 'FAIL'}\n`);

  if (persist) persistResults(suite, run);

  if (passRate < threshold) {
    console.error(`[eval] Suite "${suite}" failed — pass rate ${(passRate * 100).toFixed(1)}% < ${(threshold * 100).toFixed(0)}% threshold`);
    process.exitCode = 1;
  }

  return run;
}

// ─── History ─────────────────────────────────────────────────────────────────

function persistResults(suite: string, run: EvalRun) {
  const dir = join(process.cwd(), 'evals', 'results');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filePath = join(dir, `${suite}.json`);
  const history: EvalRun[] = existsSync(filePath)
    ? JSON.parse(readFileSync(filePath, 'utf-8'))
    : [];

  // Keep last 50 runs
  history.push(run);
  if (history.length > 50) history.splice(0, history.length - 50);

  writeFileSync(filePath, JSON.stringify(history, null, 2));
  console.log(`[eval] Results saved to ${filePath}`);
}

export function getEvalHistory(suite: string): EvalRun[] {
  const filePath = join(process.cwd(), 'evals', 'results', `${suite}.json`);
  if (!existsSync(filePath)) return [];
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

export function printTrend(suite: string) {
  const history = getEvalHistory(suite);
  if (!history.length) { console.log('No eval history found.'); return; }

  console.log(`\n[eval] Trend for "${suite}" (last ${history.length} runs):`);
  history.slice(-10).forEach(run => {
    const bar = '█'.repeat(Math.round(run.passRate * 20));
    const pct = (run.passRate * 100).toFixed(1).padStart(5);
    console.log(`  ${run.timestamp.slice(0, 10)} ${pct}% ${bar} v${run.promptVersion}`);
  });
}

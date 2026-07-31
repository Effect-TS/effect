# Example Suggestions: `effect/Metric`

- **Package:** `effect`
- **Source:** `packages/effect/src/Metric.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 0 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                            | Line | Kind               | Priority     |
| ------------------------------ | ---: | ------------------ | ------------ |
| `effect/Metric.MetricRegistry` | 1720 | `root-declaration` | **optional** |

## Optional

### `effect/Metric.MetricRegistry`

- **Source:** `packages/effect/src/Metric.ts:1720`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for the metric registry in the current context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Metric } from "effect"` and use `Metric.MetricRegistry`.
- **Suggested snippet:** Consume `Metric.MetricRegistry` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

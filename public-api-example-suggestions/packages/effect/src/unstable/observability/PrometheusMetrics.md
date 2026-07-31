# Example Suggestions: `effect/unstable/observability/PrometheusMetrics`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/observability/PrometheusMetrics.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 0 recommended, 5 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                              | Line | Kind               | Priority        |
| -------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/observability/PrometheusMetrics.FormatOptions`                  |   43 | `root-declaration` | **optional**    |
| `effect/unstable/observability/PrometheusMetrics.HttpOptions`                    |   61 | `root-declaration` | **optional**    |
| `effect/unstable/observability/PrometheusMetrics.FormatOptions.prefix`           |   48 | `member`           | **optional**    |
| `effect/unstable/observability/PrometheusMetrics.FormatOptions.metricNameMapper` |   52 | `member`           | **optional**    |
| `effect/unstable/observability/PrometheusMetrics.HttpOptions.path`               |   65 | `member`           | **optional**    |
| `effect/unstable/observability/PrometheusMetrics.formatUnsafe`                   |  123 | `root-declaration` | **discouraged** |

## Optional

### `effect/unstable/observability/PrometheusMetrics.FormatOptions`

- **Source:** `packages/effect/src/unstable/observability/PrometheusMetrics.ts:43`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for formatting metrics.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/PrometheusMetrics.FormatOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/PrometheusMetrics.HttpOptions`

- **Source:** `packages/effect/src/unstable/observability/PrometheusMetrics.ts:61`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for exporting Prometheus metrics over HTTP.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/PrometheusMetrics.HttpOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/PrometheusMetrics.FormatOptions.prefix`

- **Source:** `packages/effect/src/unstable/observability/PrometheusMetrics.ts:48`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional prefix to prepend to all metric names. The prefix will be sanitized and joined with an underscore.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/PrometheusMetrics.FormatOptions.prefix` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/PrometheusMetrics.FormatOptions.metricNameMapper`

- **Source:** `packages/effect/src/unstable/observability/PrometheusMetrics.ts:52`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional function to transform metric names before sanitization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/PrometheusMetrics.FormatOptions.metricNameMapper` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/PrometheusMetrics.HttpOptions.path`

- **Source:** `packages/effect/src/unstable/observability/PrometheusMetrics.ts:65`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The path to the HTTP route on which Prometheus metrics should be served.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/observability/PrometheusMetrics.HttpOptions.path` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/observability/PrometheusMetrics.formatUnsafe`

- **Source:** `packages/effect/src/unstable/observability/PrometheusMetrics.ts:123`
- **Kind / category:** `root-declaration` / `formatting`
- **Priority:** **discouraged**
- **Current description:** Formats all metrics in the registry to Prometheus exposition format synchronously.
- **Signature hint:** `declare function formatUnsafe(context: Context.Context<never>, options?: FormatOptions | undefined): string`
- **Import guidance:** Start from `import { PrometheusMetrics } from "effect/unstable/observability"` and use `PrometheusMetrics.formatUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `PrometheusMetrics.formatUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

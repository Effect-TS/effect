# Example Suggestions: `effect/unstable/observability/OtlpMetrics`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/observability/OtlpMetrics.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 3 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind               | Priority        |
| ----------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/observability/OtlpMetrics.make`            |   80 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpMetrics.layer`           |  462 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpMetrics.layerFromConfig` |  482 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpMetrics.MetricsData`     |  534 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/observability/OtlpMetrics.make`

- **Source:** `packages/effect/src/unstable/observability/OtlpMetrics.ts:80`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Starts a scoped OTLP metrics exporter.
- **Signature hint:** `declare function make(options: { readonly url: string; readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly exportInterval?: Duration.Input | undefined; readonly shutdownTimeout?: Duration.Input | undefined; readonly temporality?: AggregationTemporality | undefined; }): Effect.Effect<void, never, Exporter.Flusher | HttpClient.HttpClient | OtlpSerialization | Scope.Scope>`
- **Import guidance:** Start from `import { OtlpMetrics } from "effect/unstable/observability"` and use `OtlpMetrics.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OtlpMetrics.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/OtlpMetrics.layer`

- **Source:** `packages/effect/src/unstable/observability/OtlpMetrics.ts:462`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that starts the OTLP metrics exporter created by `make`.
- **Signature hint:** `declare function layer(options: { readonly url: string; readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly exportInterval?: Duration.Input | undefined; readonly shutdownTimeout?: Duration.Input | undefined; readonly temporality?: AggregationTemporality | undefined; }): Layer.Layer<Exporter.Flusher, never, HttpClient.HttpClient | OtlpSerialization>`
- **Import guidance:** Start from `import { OtlpMetrics } from "effect/unstable/observability"` and use `OtlpMetrics.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtlpMetrics.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/OtlpMetrics.layerFromConfig`

- **Source:** `packages/effect/src/unstable/observability/OtlpMetrics.ts:482`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates an OTLP metrics layer from OpenTelemetry configuration.
- **Signature hint:** `declare function layerFromConfig(options?: { readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; }): Layer.Layer<Exporter.Flusher, never, HttpClient.HttpClient | OtlpSerialization>`
- **Import guidance:** Start from `import { OtlpMetrics } from "effect/unstable/observability"` and use `OtlpMetrics.layerFromConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtlpMetrics.layerFromConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/observability/OtlpMetrics.MetricsData`

- **Source:** `packages/effect/src/unstable/observability/OtlpMetrics.ts:534`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OTLP metrics payload serialized by `OtlpMetrics`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpMetrics.MetricsData`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

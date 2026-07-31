# Example Suggestions: `effect/unstable/observability/OtlpLogger`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/observability/OtlpLogger.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 3 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/observability/OtlpLogger.make`            |   43 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpLogger.layer`           |  106 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpLogger.layerFromConfig` |  130 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpLogger.LogsData`        |  182 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/observability/OtlpLogger.make`

- **Source:** `packages/effect/src/unstable/observability/OtlpLogger.ts:43`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an Effect `Logger` that exports log records through OTLP.
- **Signature hint:** `declare function make(options: { readonly url: string; readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly exportInterval?: Duration.Input | undefined; readonly maxBatchSize?: number | undefined; readonly shutdownTimeout?: Duration.Input | undefined; readonly excludeLogSpans?: boolean | undefined; }): Effect.Effect<Logger.Logger<unknown, void>, never, Exporter.Flusher | OtlpSerialization | HttpClient.HttpClient | Scope.Scope>`
- **Import guidance:** Start from `import { OtlpLogger } from "effect/unstable/observability"` and use `OtlpLogger.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OtlpLogger.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/OtlpLogger.layer`

- **Source:** `packages/effect/src/unstable/observability/OtlpLogger.ts:106`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that installs the OTLP logger created by `make`.
- **Signature hint:** `declare function layer(options: { readonly url: string; readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly exportInterval?: Duration.Input | undefined; readonly maxBatchSize?: number | undefined; readonly shutdownTimeout?: Duration.Input | undefined; readonly excludeLogSpans?: boolean | undefined; readonly mergeWithExisting?: boolean | undefined; }): Layer.Layer<Exporter.Flusher, never, HttpClient.HttpClient | OtlpSerialization>`
- **Import guidance:** Start from `import { OtlpLogger } from "effect/unstable/observability"` and use `OtlpLogger.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtlpLogger.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/OtlpLogger.layerFromConfig`

- **Source:** `packages/effect/src/unstable/observability/OtlpLogger.ts:130`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates an OTLP logs layer from OpenTelemetry configuration.
- **Signature hint:** `declare function layerFromConfig(options?: { readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly excludeLogSpans?: boolean | undefined; readonly mergeWithExisting?: boolean | undefined; }): Layer.Layer<Exporter.Flusher, never, HttpClient.HttpClient | OtlpSerialization>`
- **Import guidance:** Start from `import { OtlpLogger } from "effect/unstable/observability"` and use `OtlpLogger.layerFromConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtlpLogger.layerFromConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/observability/OtlpLogger.LogsData`

- **Source:** `packages/effect/src/unstable/observability/OtlpLogger.ts:182`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OTLP logs payload serialized by `OtlpLogger`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpLogger.LogsData`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

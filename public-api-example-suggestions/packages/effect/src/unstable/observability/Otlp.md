# Example Suggestions: `effect/unstable/observability/Otlp`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/observability/Otlp.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 4 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority        |
| ---------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/observability/Otlp.layer`           |   35 | `root-declaration` | **recommended** |
| `effect/unstable/observability/Otlp.layerFromConfig` |   93 | `root-declaration` | **recommended** |
| `effect/unstable/observability/Otlp.layerJson`       |  129 | `root-declaration` | **recommended** |
| `effect/unstable/observability/Otlp.layerProtobuf`   |  155 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/observability/Otlp.layer`

- **Source:** `packages/effect/src/unstable/observability/Otlp.ts:35`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a combined OTLP layer for logs, metrics, and traces.
- **Signature hint:** `declare function layer(options: { readonly baseUrl: string; readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly maxBatchSize?: number | undefined; readonly tracerContext?: (<X>(primitive: Tracer.EffectPrimitive<X>, span: Tracer.AnySpan) => X) | undefined; readonly loggerExportInterval?: Duration.Input | undefined; readonly loggerExcludeLogSpans?: boolean | undefined; readonly loggerMergeWithExisting?: boolean | undefined; readonly metricsExportInterval?: Duration.Input | undefined; readonly metricsTemporality?: AggregationTemporality | undefined; readonly tracerExportInterval?: Duration.Input | undefined; readonly shutdownTimeout?: Duration.Input | undefined; }): Layer.Layer<never, never, HttpClient.HttpClient | OtlpSerialization.OtlpSerialization>`
- **Import guidance:** Start from `import { Otlp } from "effect/unstable/observability"` and use `Otlp.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `Otlp.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/Otlp.layerFromConfig`

- **Source:** `packages/effect/src/unstable/observability/Otlp.ts:93`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a combined OTLP layer for logs, metrics, and traces from OpenTelemetry configuration.
- **Signature hint:** `declare function layerFromConfig(options?: { readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly tracerContext?: (<X>(primitive: Tracer.EffectPrimitive<X>, span: Tracer.AnySpan) => X) | undefined; readonly loggerExcludeLogSpans?: boolean | undefined; readonly loggerMergeWithExisting?: boolean | undefined; }): Layer.Layer<never, never, HttpClient.HttpClient | OtlpSerialization.OtlpSerialization>`
- **Import guidance:** Start from `import { Otlp } from "effect/unstable/observability"` and use `Otlp.layerFromConfig`.
- **Suggested snippet:** Use the public setup or registry consumed by `Otlp.layerFromConfig`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/Otlp.layerJson`

- **Source:** `packages/effect/src/unstable/observability/Otlp.ts:129`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates the combined OTLP logs, metrics, and traces layer using JSON serialization.
- **Signature hint:** `declare function layerJson(options: { readonly baseUrl: string; readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly maxBatchSize?: number | undefined; readonly tracerContext?: (<X>(primitive: Tracer.EffectPrimitive<X>, span: Tracer.AnySpan) => X) | undefined; readonly loggerExportInterval?: Duration.Input | undefined; readonly loggerExcludeLogSpans?: boolean | undefined; readonly loggerMergeWithExisting?: boolean | undefined; readonly metricsExportInterval?: Duration.Input | undefined; readonly metricsTemporality?: AggregationTemporality | undefined; readonly tracerExportInterval?: Duration.Input | undefined; readonly shutdownTimeout?: Duration.Input | undefined; }): Layer.Layer<never, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { Otlp } from "effect/unstable/observability"` and use `Otlp.layerJson`.
- **Suggested snippet:** Use the public setup or registry consumed by `Otlp.layerJson`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/Otlp.layerProtobuf`

- **Source:** `packages/effect/src/unstable/observability/Otlp.ts:155`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates the combined OTLP logs, metrics, and traces layer using protobuf serialization.
- **Signature hint:** `declare function layerProtobuf(options: { readonly baseUrl: string; readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly maxBatchSize?: number | undefined; readonly tracerContext?: (<X>(primitive: Tracer.EffectPrimitive<X>, span: Tracer.AnySpan) => X) | undefined; readonly loggerExportInterval?: Duration.Input | undefined; readonly loggerExcludeLogSpans?: boolean | undefined; readonly loggerMergeWithExisting?: boolean | undefined; readonly metricsExportInterval?: Duration.Input | undefined; readonly metricsTemporality?: AggregationTemporality | undefined; readonly tracerExportInterval?: Duration.Input | undefined; readonly shutdownTimeout?: Duration.Input | undefined; }): Layer.Layer<never, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { Otlp } from "effect/unstable/observability"` and use `Otlp.layerProtobuf`.
- **Suggested snippet:** Use the public setup or registry consumed by `Otlp.layerProtobuf`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

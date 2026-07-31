# Example Suggestions: `effect/unstable/observability/OtlpTracer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/observability/OtlpTracer.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 3 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/observability/OtlpTracer.make`            |   45 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpTracer.layer`           |  125 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpTracer.layerFromConfig` |  149 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpTracer.TraceData`       |  361 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpTracer.ResourceSpan`    |  371 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpTracer.ScopeSpan`       |  383 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/observability/OtlpTracer.make`

- **Source:** `packages/effect/src/unstable/observability/OtlpTracer.ts:45`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Tracer` that exports ended sampled spans to an OTLP traces endpoint.
- **Signature hint:** `declare function make(options: { readonly url: string; readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly exportInterval?: Duration.Input | undefined; readonly maxBatchSize?: number | undefined; readonly context?: (<X>(primitive: Tracer.EffectPrimitive<X>, span: Tracer.AnySpan) => X) | undefined; readonly shutdownTimeout?: Duration.Input | undefined; }): Effect.Effect<Tracer.Tracer, never, Exporter.Flusher | OtlpSerialization | HttpClient.HttpClient | Scope.Scope>`
- **Import guidance:** Start from `import { OtlpTracer } from "effect/unstable/observability"` and use `OtlpTracer.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OtlpTracer.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/OtlpTracer.layer`

- **Source:** `packages/effect/src/unstable/observability/OtlpTracer.ts:125`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `Tracer.Tracer` using the OTLP tracer created by `make`.
- **Signature hint:** `declare function layer(options: { readonly url: string; readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly exportInterval?: Duration.Input | undefined; readonly maxBatchSize?: number | undefined; readonly context?: (<X>(primitive: Tracer.EffectPrimitive<X>, span: Tracer.AnySpan) => X) | undefined; readonly shutdownTimeout?: Duration.Input | undefined; }): Layer.Layer<Exporter.Flusher, never, OtlpSerialization | HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OtlpTracer } from "effect/unstable/observability"` and use `OtlpTracer.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtlpTracer.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/observability/OtlpTracer.layerFromConfig`

- **Source:** `packages/effect/src/unstable/observability/OtlpTracer.ts:149`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates an OTLP traces layer from OpenTelemetry configuration.
- **Signature hint:** `declare function layerFromConfig(options?: { readonly resource?: { readonly serviceName?: string | undefined; readonly serviceVersion?: string | undefined; readonly attributes?: Record<string, unknown>; } | undefined; readonly headers?: Headers.Input | undefined; readonly context?: (<X>(primitive: Tracer.EffectPrimitive<X>, span: Tracer.AnySpan) => X) | undefined; }): Layer.Layer<Exporter.Flusher, never, HttpClient.HttpClient | OtlpSerialization>`
- **Import guidance:** Start from `import { OtlpTracer } from "effect/unstable/observability"` and use `OtlpTracer.layerFromConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtlpTracer.layerFromConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/observability/OtlpTracer.TraceData`

- **Source:** `packages/effect/src/unstable/observability/OtlpTracer.ts:361`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Root OTLP traces payload containing spans grouped by resource.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpTracer.TraceData`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpTracer.ResourceSpan`

- **Source:** `packages/effect/src/unstable/observability/OtlpTracer.ts:371`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Group of OTLP scope spans associated with a single resource.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpTracer.ResourceSpan`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpTracer.ScopeSpan`

- **Source:** `packages/effect/src/unstable/observability/OtlpTracer.ts:383`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Group of OTLP spans emitted by a single instrumentation scope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/observability/OtlpTracer.ScopeSpan`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

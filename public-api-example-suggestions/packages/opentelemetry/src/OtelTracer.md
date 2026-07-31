# Example Suggestions: `@effect/opentelemetry/OtelTracer`

- **Package:** `@effect/opentelemetry`
- **Source:** `packages/opentelemetry/src/OtelTracer.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 13 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/opentelemetry/OtelTracer.layerGlobalProvider`    |  171 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.layerTracer`            |  182 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.layerGlobalTracer`      |  200 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.layerGlobal`            |  210 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.layerWithoutOtelTracer` |  220 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.layer`                  |  237 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.OtelTracer`             |   46 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.OtelTracerProvider`     |   57 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.OtelTraceFlags`         |   68 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.OtelTraceState`         |   79 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.make`                   |   94 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.makeExternalSpan`       |  127 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.withSpanContext`        |  368 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelTracer.currentOtelSpan`        |  261 | `root-declaration` | **optional**    |

## Recommended

### `@effect/opentelemetry/OtelTracer.layerGlobalProvider`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:171`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the current global OpenTelemetry tracer provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.layerGlobalProvider`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtelTracer.layerGlobalProvider`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.layerTracer`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:182`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that creates an OpenTelemetry tracer from the provided tracer provider and resource metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.layerTracer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtelTracer.layerTracer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.layerGlobalTracer`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:200`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that creates an OpenTelemetry tracer from the global tracer provider and the current resource.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.layerGlobalTracer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtelTracer.layerGlobalTracer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.layerGlobal`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:210`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that installs an Effect tracer backed by the global OpenTelemetry tracer provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.layerGlobal`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtelTracer.layerGlobal`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.layerWithoutOtelTracer`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:220`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that installs the Effect tracer using an `OtelTracer` already provided in the environment.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.layerWithoutOtelTracer`.
- **Suggested snippet:** Use the public setup or registry consumed by `OtelTracer.layerWithoutOtelTracer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.layer`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:237`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that creates an OpenTelemetry tracer from a provider and resource, then installs it as the Effect tracer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtelTracer.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.OtelTracer`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:46`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service containing the OpenTelemetry `Tracer` used to create spans for Effect tracing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.OtelTracer`.
- **Suggested snippet:** Consume `OtelTracer.OtelTracer` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.OtelTracerProvider`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:57`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service containing the OpenTelemetry `TracerProvider` used to obtain tracers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.OtelTracerProvider`.
- **Suggested snippet:** Consume `OtelTracer.OtelTracerProvider` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.OtelTraceFlags`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:68`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service containing OpenTelemetry trace flags used when constructing external span contexts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.OtelTraceFlags`.
- **Suggested snippet:** Consume `OtelTracer.OtelTraceFlags` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.OtelTraceState`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:79`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service containing OpenTelemetry trace state used when constructing external span contexts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.OtelTraceState`.
- **Suggested snippet:** Consume `OtelTracer.OtelTraceState` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.make`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:94`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an Effect `Tracer` implementation backed by the configured OpenTelemetry tracer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.make`.
- **Suggested snippet:** Construct one representative value with `OtelTracer.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.makeExternalSpan`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:127`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an Effect external span from an OpenTelemetry span context, preserving trace flags and trace state when provided.
- **Signature hint:** `declare function makeExternalSpan(options: { readonly traceId: string; readonly spanId: string; readonly traceFlags?: number | undefined; readonly traceState?: string | Otel.TraceState | undefined; }): Tracer.ExternalSpan`
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.makeExternalSpan`.
- **Suggested snippet:** Construct one representative value with `OtelTracer.makeExternalSpan`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelTracer.withSpanContext`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:368`
- **Kind / category:** `root-declaration` / `propagation`
- **Priority:** **recommended**
- **Current description:** Sets an effect's parent span from the given OpenTelemetry `SpanContext`.
- **Signature hint:** `declare function withSpanContext(spanContext: Otel.SpanContext): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Tracer.ParentSpan>> declare function withSpanContext<A, E, R>(self: Effect.Effect<A, E, R>, spanContext: Otel.SpanContext): Effect.Effect<A, E, Exclude<R, Tracer.ParentSpan>>`
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.withSpanContext`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OtelTracer.withSpanContext`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/opentelemetry/OtelTracer.currentOtelSpan`

- **Source:** `packages/opentelemetry/src/OtelTracer.ts:261`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **optional**
- **Current description:** Gets the current OpenTelemetry span.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtelTracer } from "@effect/opentelemetry"` and use `OtelTracer.currentOtelSpan`.
- **Suggested snippet:** Use `OtelTracer.currentOtelSpan` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

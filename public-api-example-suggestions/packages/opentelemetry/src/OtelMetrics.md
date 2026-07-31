# Example Suggestions: `@effect/opentelemetry/OtelMetrics`

- **Package:** `@effect/opentelemetry`
- **Source:** `packages/opentelemetry/src/OtelMetrics.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/opentelemetry/OtelMetrics.makeProducer`          |   58 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelMetrics.registerProducer`      |   71 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/OtelMetrics.TemporalityPreference` |   36 | `root-declaration` | **optional**    |

## Recommended

### `@effect/opentelemetry/OtelMetrics.makeProducer`

- **Source:** `packages/opentelemetry/src/OtelMetrics.ts:58`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OpenTelemetry metric producer from Effect metrics.
- **Signature hint:** `declare function makeProducer(temporality?: TemporalityPreference): Effect.Effect<MetricProducer, never, Resource>`
- **Import guidance:** Start from `import { OtelMetrics } from "@effect/opentelemetry"` and use `OtelMetrics.makeProducer`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OtelMetrics.makeProducer`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/OtelMetrics.registerProducer`

- **Source:** `packages/opentelemetry/src/OtelMetrics.ts:71`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Registers a metric producer with one or more metric readers.
- **Signature hint:** `declare function registerProducer(self: MetricProducer, metricReader: LazyArg<MetricReader | Arr.NonEmptyReadonlyArray<MetricReader>>, options?: { readonly shutdownTimeout?: Duration.Input | undefined; }): Effect.Effect<Array<any>, never, Scope.Scope>`
- **Import guidance:** Start from `import { OtelMetrics } from "@effect/opentelemetry"` and use `OtelMetrics.registerProducer`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OtelMetrics.registerProducer`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/opentelemetry/OtelMetrics.TemporalityPreference`

- **Source:** `packages/opentelemetry/src/OtelMetrics.ts:36`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Determines how metric values relate to the time interval over which they are aggregated.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/opentelemetry/OtelMetrics.TemporalityPreference`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

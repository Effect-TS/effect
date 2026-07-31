# Example Suggestions: `@effect/opentelemetry/NodeSdk`

- **Package:** `@effect/opentelemetry`
- **Source:** `packages/opentelemetry/src/NodeSdk.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 3 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/opentelemetry/NodeSdk.layerTracerProvider` |   57 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/NodeSdk.layer`               |  109 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/NodeSdk.layerEmpty`          |  162 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/NodeSdk.Configuration`       |   35 | `root-declaration` | **optional**    |

## Recommended

### `@effect/opentelemetry/NodeSdk.layerTracerProvider`

- **Source:** `packages/opentelemetry/src/NodeSdk.ts:57`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a scoped Node OpenTelemetry tracer provider from one or more span processors and shuts it down when the layer is released.
- **Signature hint:** `declare function layerTracerProvider(processor: SpanProcessor | NonEmptyReadonlyArray<SpanProcessor>, config?: Omit<TracerConfig, 'resource'> & { readonly shutdownTimeout?: Duration.Input | undefined; }): Layer.Layer<Tracer.OtelTracerProvider, never, Resource.Resource>`
- **Import guidance:** Start from `import { NodeSdk } from "@effect/opentelemetry"` and use `NodeSdk.layerTracerProvider`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeSdk.layerTracerProvider`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/NodeSdk.layer`

- **Source:** `packages/opentelemetry/src/NodeSdk.ts:109`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a Node OpenTelemetry layer from configuration, enabling tracing, metrics, and logging only when their processors or readers are supplied.
- **Signature hint:** `declare function layer(evaluate: LazyArg<Configuration>): Layer.Layer<Resource.Resource> declare function layer<R, E>(evaluate: Effect.Effect<Configuration, E, R>): Layer.Layer<Resource.Resource, E, R>`
- **Import guidance:** Start from `import { NodeSdk } from "@effect/opentelemetry"` and use `NodeSdk.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeSdk.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/NodeSdk.layerEmpty`

- **Source:** `packages/opentelemetry/src/NodeSdk.ts:162`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides an empty OpenTelemetry `Resource`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeSdk } from "@effect/opentelemetry"` and use `NodeSdk.layerEmpty`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeSdk.layerEmpty`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/opentelemetry/NodeSdk.Configuration`

- **Source:** `packages/opentelemetry/src/NodeSdk.ts:35`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for the Node OpenTelemetry layer, including optional tracing, metrics, logging, resource, and shutdown settings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/opentelemetry/NodeSdk.Configuration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

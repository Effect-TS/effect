# Example Suggestions: `@effect/opentelemetry/WebSdk`

- **Package:** `@effect/opentelemetry`
- **Source:** `packages/opentelemetry/src/WebSdk.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/opentelemetry/WebSdk.layerTracerProvider` |   54 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/WebSdk.layer`               |  102 | `root-declaration` | **recommended** |
| `@effect/opentelemetry/WebSdk.Configuration`       |   33 | `root-declaration` | **optional**    |

## Recommended

### `@effect/opentelemetry/WebSdk.layerTracerProvider`

- **Source:** `packages/opentelemetry/src/WebSdk.ts:54`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a scoped Web OpenTelemetry tracer provider from one or more span processors and shuts it down when the layer is released.
- **Signature hint:** `declare function layerTracerProvider(processor: SpanProcessor | NonEmptyReadonlyArray<SpanProcessor>, config?: Omit<TracerConfig, 'resource'>): Layer.Layer<Tracer.OtelTracerProvider, never, Resource.Resource>`
- **Import guidance:** Start from `import { WebSdk } from "@effect/opentelemetry"` and use `WebSdk.layerTracerProvider`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `WebSdk.layerTracerProvider`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/opentelemetry/WebSdk.layer`

- **Source:** `packages/opentelemetry/src/WebSdk.ts:102`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a Web OpenTelemetry layer from configuration, providing the resource and enabling tracing, metrics, and logging when configured.
- **Signature hint:** `declare function layer(evaluate: LazyArg<Configuration>): Layer.Layer<Resource.Resource> declare function layer<E, R>(evaluate: Effect.Effect<Configuration, E, R>): Layer.Layer<Resource.Resource, E, R>`
- **Import guidance:** Start from `import { WebSdk } from "@effect/opentelemetry"` and use `WebSdk.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `WebSdk.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/opentelemetry/WebSdk.Configuration`

- **Source:** `packages/opentelemetry/src/WebSdk.ts:33`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration for the Web OpenTelemetry layer, including resource metadata and optional tracing, metrics, and logging settings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/opentelemetry/WebSdk.Configuration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

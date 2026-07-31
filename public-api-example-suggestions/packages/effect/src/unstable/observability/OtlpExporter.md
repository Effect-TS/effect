# Example Suggestions: `effect/unstable/observability/OtlpExporter`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/observability/OtlpExporter.ts`
- **Uncovered API records:** 3
- **Priorities:** 1 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/observability/OtlpExporter.Flusher`      |   62 | `root-declaration` | **required**    |
| `effect/unstable/observability/OtlpExporter.make`         |  149 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpExporter.layerFlusher` |  113 | `root-declaration` | **optional**    |

## Required

### `effect/unstable/observability/OtlpExporter.Flusher`

- **Source:** `packages/effect/src/unstable/observability/OtlpExporter.ts:62`
- **Kind / category:** `root-declaration` / `flushing`
- **Priority:** **required**
- **Current description:** Registry of exporter flush operations, used to manually drain buffered telemetry before the surrounding scope closes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtlpExporter } from "effect/unstable/observability"` and use `OtlpExporter.Flusher`.
- **Suggested snippet:** Consume `OtlpExporter.Flusher` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/unstable/observability/OtlpExporter.make`

- **Source:** `packages/effect/src/unstable/observability/OtlpExporter.ts:149`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped OTLP batch exporter.
- **Signature hint:** `declare function make(options: { readonly url: string; readonly headers: Headers.Input | undefined; readonly label: string; readonly exportInterval: Duration.Input; readonly maxBatchSize: number | 'disabled'; readonly body: (data: Array<any>) => HttpBody; readonly shutdownTimeout: Duration.Input; }): Effect.Effect<{ readonly push: (data: unknown) => void; }, never, Flusher | HttpClient.HttpClient | Scope.Scope>`
- **Import guidance:** Start from `import { OtlpExporter } from "effect/unstable/observability"` and use `OtlpExporter.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OtlpExporter.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/observability/OtlpExporter.layerFlusher`

- **Source:** `packages/effect/src/unstable/observability/OtlpExporter.ts:113`
- **Kind / category:** `root-declaration` / `flushing`
- **Priority:** **optional**
- **Current description:** Provides a `Flusher` backed by a fresh registry.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtlpExporter } from "effect/unstable/observability"` and use `OtlpExporter.layerFlusher`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtlpExporter.layerFlusher`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

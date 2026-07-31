# Example Suggestions: `effect/unstable/observability/OtlpSerialization`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/observability/OtlpSerialization.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 1 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                 | Line | Kind               | Priority        |
| ------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/observability/OtlpSerialization.OtlpSerialization` |   25 | `root-declaration` | **recommended** |
| `effect/unstable/observability/OtlpSerialization.layerJson`         |   37 | `root-declaration` | **optional**    |
| `effect/unstable/observability/OtlpSerialization.layerProtobuf`     |   50 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/observability/OtlpSerialization.OtlpSerialization`

- **Source:** `packages/effect/src/unstable/observability/OtlpSerialization.ts:25`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service for serializing OTLP traces, metrics, and logs into HTTP request bodies.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtlpSerialization } from "effect/unstable/observability"` and use `OtlpSerialization.OtlpSerialization`.
- **Suggested snippet:** Consume `OtlpSerialization.OtlpSerialization` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/observability/OtlpSerialization.layerJson`

- **Source:** `packages/effect/src/unstable/observability/OtlpSerialization.ts:37`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides `OtlpSerialization` using OTLP/HTTP JSON bodies.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtlpSerialization } from "effect/unstable/observability"` and use `OtlpSerialization.layerJson`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtlpSerialization.layerJson`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/observability/OtlpSerialization.layerProtobuf`

- **Source:** `packages/effect/src/unstable/observability/OtlpSerialization.ts:50`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides `OtlpSerialization` using protobuf-encoded OTLP bodies with the `application/x-protobuf` content type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OtlpSerialization } from "effect/unstable/observability"` and use `OtlpSerialization.layerProtobuf`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OtlpSerialization.layerProtobuf`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

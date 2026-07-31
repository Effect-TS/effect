# Example Suggestions: `effect/unstable/ai/EmbeddingModel`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 3 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                   | Line | Kind               | Priority        |
| ----------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/EmbeddingModel.EmbeddingModel`    |   36 | `root-declaration` | **recommended** |
| `effect/unstable/ai/EmbeddingModel.Dimensions`        |   53 | `root-declaration` | **recommended** |
| `effect/unstable/ai/EmbeddingModel.make`              |  202 | `root-declaration` | **recommended** |
| `effect/unstable/ai/EmbeddingModel.ProviderOptions`   |  115 | `root-declaration` | **optional**    |
| `effect/unstable/ai/EmbeddingModel.EmbeddingRequest`  |  147 | `root-declaration` | **optional**    |
| `effect/unstable/ai/EmbeddingModel.EmbeddingUsage`    |   69 | `root-declaration` | **optional**    |
| `effect/unstable/ai/EmbeddingModel.EmbedResponse`     |   81 | `root-declaration` | **optional**    |
| `effect/unstable/ai/EmbeddingModel.EmbedManyResponse` |  102 | `root-declaration` | **optional**    |
| `effect/unstable/ai/EmbeddingModel.ProviderResponse`  |  125 | `root-declaration` | **optional**    |
| `effect/unstable/ai/EmbeddingModel.Service`           |  159 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/ai/EmbeddingModel.EmbeddingModel`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:36`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for embedding model operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EmbeddingModel } from "effect/unstable/ai"` and use `EmbeddingModel.EmbeddingModel`.
- **Suggested snippet:** Consume `EmbeddingModel.EmbeddingModel` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/EmbeddingModel.Dimensions`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:53`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag that provides the current embedding dimensions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EmbeddingModel } from "effect/unstable/ai"` and use `EmbeddingModel.Dimensions`.
- **Suggested snippet:** Consume `EmbeddingModel.Dimensions` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/EmbeddingModel.make`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:202`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an EmbeddingModel service from a provider embedMany implementation.
- **Signature hint:** `declare function make(params: { readonly embedMany: (options: ProviderOptions) => Effect.Effect<ProviderResponse, AiError.AiError>; }): Effect.Effect<Service>`
- **Import guidance:** Start from `import { EmbeddingModel } from "effect/unstable/ai"` and use `EmbeddingModel.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EmbeddingModel.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/EmbeddingModel.ProviderOptions`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:115`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Provider input options for embedding requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/EmbeddingModel.ProviderOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/EmbeddingModel.EmbeddingRequest`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:147`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Represents a tagged request used by request resolvers for embedding operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EmbeddingModel } from "effect/unstable/ai"` and use `EmbeddingModel.EmbeddingRequest`.
- **Suggested snippet:** Use `EmbeddingModel.EmbeddingRequest` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/EmbeddingModel.EmbeddingUsage`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:69`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents token usage metadata for embedding operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EmbeddingModel } from "effect/unstable/ai"` and use `EmbeddingModel.EmbeddingUsage`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `EmbeddingModel.EmbeddingUsage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/EmbeddingModel.EmbedResponse`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:81`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response for a single embedding request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EmbeddingModel } from "effect/unstable/ai"` and use `EmbeddingModel.EmbedResponse`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `EmbeddingModel.EmbedResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/EmbeddingModel.EmbedManyResponse`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:102`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Response for batch embedding requests containing per-input embeddings and usage metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EmbeddingModel } from "effect/unstable/ai"` and use `EmbeddingModel.EmbedManyResponse`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `EmbeddingModel.EmbedManyResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/EmbeddingModel.ProviderResponse`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:125`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Provider response for batch embedding requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/EmbeddingModel.ProviderResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/EmbeddingModel.Service`

- **Source:** `packages/effect/src/unstable/ai/EmbeddingModel.ts:159`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Defines the service interface for embedding operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/EmbeddingModel.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

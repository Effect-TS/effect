# Example Suggestions: `@effect/ai-openai/OpenAiEmbeddingModel`

- **Package:** `@effect/ai-openai`
- **Source:** `packages/ai/openai/src/OpenAiEmbeddingModel.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 5 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind               | Priority        |
| ----------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/ai-openai/OpenAiEmbeddingModel.layer`              |  168 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiEmbeddingModel.Config`             |   48 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiEmbeddingModel.model`              |   77 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiEmbeddingModel.make`               |  127 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiEmbeddingModel.withConfigOverride` |  193 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiEmbeddingModel.Model`              |   27 | `root-declaration` | **optional**    |

## Recommended

### `@effect/ai-openai/OpenAiEmbeddingModel.layer`

- **Source:** `packages/ai/openai/src/OpenAiEmbeddingModel.ts:168`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer for the OpenAI embedding model.
- **Signature hint:** `declare function layer(options: { readonly model: (string & {}) | Model; readonly config?: Omit<typeof Config.Service, 'model'> | undefined; }): Layer.Layer<EmbeddingModel.EmbeddingModel, never, OpenAiClient>`
- **Import guidance:** Start from `import { OpenAiEmbeddingModel } from "@effect/ai-openai"` and use `OpenAiEmbeddingModel.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenAiEmbeddingModel.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiEmbeddingModel.Config`

- **Source:** `packages/ai/openai/src/OpenAiEmbeddingModel.ts:48`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for OpenAI embedding model configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiEmbeddingModel } from "@effect/ai-openai"` and use `OpenAiEmbeddingModel.Config`.
- **Suggested snippet:** Consume `OpenAiEmbeddingModel.Config` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiEmbeddingModel.model`

- **Source:** `packages/ai/openai/src/OpenAiEmbeddingModel.ts:77`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `AiModel` for an OpenAI embedding model with its configured vector dimensions.
- **Signature hint:** `declare function model(model: (string & {}) | Model, options: { readonly dimensions: number; readonly config?: Omit<typeof Config.Service, 'model' | 'dimensions'>; }): AiModel.Model<'openai', EmbeddingModel.EmbeddingModel | EmbeddingModel.Dimensions, OpenAiClient>`
- **Import guidance:** Start from `import { OpenAiEmbeddingModel } from "@effect/ai-openai"` and use `OpenAiEmbeddingModel.model`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an `AiModel` for an OpenAI embedding model with its configured vector dimensions. Call `OpenAiEmbeddingModel.model` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiEmbeddingModel.make`

- **Source:** `packages/ai/openai/src/OpenAiEmbeddingModel.ts:127`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OpenAI embedding model service.
- **Signature hint:** `declare function make(args_0: { readonly model: (string & {}) | Model; readonly config?: Omit<typeof Config.Service, 'model'> | undefined; }): Effect.Effect<EmbeddingModel.Service, never, OpenAiClient>`
- **Import guidance:** Start from `import { OpenAiEmbeddingModel } from "@effect/ai-openai"` and use `OpenAiEmbeddingModel.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenAiEmbeddingModel.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiEmbeddingModel.withConfigOverride`

- **Source:** `packages/ai/openai/src/OpenAiEmbeddingModel.ts:193`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Provides config overrides for OpenAI embedding model operations.
- **Signature hint:** `declare function withConfigOverride(overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>> declare function withConfigOverride<A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>`
- **Import guidance:** Start from `import { OpenAiEmbeddingModel } from "@effect/ai-openai"` and use `OpenAiEmbeddingModel.withConfigOverride`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenAiEmbeddingModel.withConfigOverride`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-openai/OpenAiEmbeddingModel.Model`

- **Source:** `packages/ai/openai/src/OpenAiEmbeddingModel.ts:27`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Model identifiers supported by OpenAI's embeddings API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiEmbeddingModel.Model`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

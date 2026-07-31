# Example Suggestions: `@effect/ai-openai/OpenAiLanguageModel`

- **Package:** `@effect/ai-openai`
- **Source:** `packages/ai/openai/src/OpenAiLanguageModel.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 5 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/ai-openai/OpenAiLanguageModel.layer`              |  702 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiLanguageModel.withConfigOverride` |  729 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiLanguageModel.Config`             |   80 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiLanguageModel.model`              |  543 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiLanguageModel.make`               |  582 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiLanguageModel.Model`              |   51 | `root-declaration` | **optional**    |

## Recommended

### `@effect/ai-openai/OpenAiLanguageModel.layer`

- **Source:** `packages/ai/openai/src/OpenAiLanguageModel.ts:702`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that provides the OpenAI `LanguageModel.LanguageModel` service.
- **Signature hint:** `declare function layer(options: { readonly model: (string & {}) | Model; readonly config?: Omit<typeof Config.Service, 'model'> | undefined; }): Layer.Layer<LanguageModel.LanguageModel, never, OpenAiClient>`
- **Import guidance:** Start from `import { OpenAiLanguageModel } from "@effect/ai-openai"` and use `OpenAiLanguageModel.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenAiLanguageModel.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiLanguageModel.withConfigOverride`

- **Source:** `packages/ai/openai/src/OpenAiLanguageModel.ts:729`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Provides scoped config overrides for OpenAI language model operations.
- **Signature hint:** `declare function withConfigOverride(overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>> declare function withConfigOverride<A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>`
- **Import guidance:** Start from `import { OpenAiLanguageModel } from "@effect/ai-openai"` and use `OpenAiLanguageModel.withConfigOverride`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenAiLanguageModel.withConfigOverride`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiLanguageModel.Config`

- **Source:** `packages/ai/openai/src/OpenAiLanguageModel.ts:80`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for OpenAI language model configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiLanguageModel } from "@effect/ai-openai"` and use `OpenAiLanguageModel.Config`.
- **Suggested snippet:** Consume `OpenAiLanguageModel.Config` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiLanguageModel.model`

- **Source:** `packages/ai/openai/src/OpenAiLanguageModel.ts:543`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OpenAI model descriptor that can be provided with `Effect.provide`.
- **Signature hint:** `declare function model(model: (string & {}) | Model, config?: Omit<typeof Config.Service, 'model'>): AiModel.Model<'openai', LanguageModel.LanguageModel, OpenAiClient>`
- **Import guidance:** Start from `import { OpenAiLanguageModel } from "@effect/ai-openai"` and use `OpenAiLanguageModel.model`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an OpenAI model descriptor that can be provided with `Effect.provide`. Call `OpenAiLanguageModel.model` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiLanguageModel.make`

- **Source:** `packages/ai/openai/src/OpenAiLanguageModel.ts:582`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OpenAI `LanguageModel` service from a model identifier and optional request defaults.
- **Signature hint:** `declare function make(args_0: { readonly model: (string & {}) | Model; readonly config?: Omit<typeof Config.Service, 'model'> | undefined; }): Effect.Effect<LanguageModel.Service, never, OpenAiClient>`
- **Import guidance:** Start from `import { OpenAiLanguageModel } from "@effect/ai-openai"` and use `OpenAiLanguageModel.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenAiLanguageModel.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-openai/OpenAiLanguageModel.Model`

- **Source:** `packages/ai/openai/src/OpenAiLanguageModel.ts:51`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAI model identifiers supported by the Responses API language model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiLanguageModel.Model`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

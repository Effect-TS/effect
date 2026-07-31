# Example Suggestions: `@effect/ai-openrouter/OpenRouterLanguageModel`

- **Package:** `@effect/ai-openrouter`
- **Source:** `packages/ai/openrouter/src/OpenRouterLanguageModel.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 5 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/ai-openrouter/OpenRouterLanguageModel.layer`              |  619 | `root-declaration` | **recommended** |
| `@effect/ai-openrouter/OpenRouterLanguageModel.Config`             |   60 | `root-declaration` | **recommended** |
| `@effect/ai-openrouter/OpenRouterLanguageModel.model`              |  507 | `root-declaration` | **recommended** |
| `@effect/ai-openrouter/OpenRouterLanguageModel.make`               |  541 | `root-declaration` | **recommended** |
| `@effect/ai-openrouter/OpenRouterLanguageModel.withConfigOverride` |  645 | `root-declaration` | **recommended** |
| `@effect/ai-openrouter/OpenRouterLanguageModel.ReasoningDetails`   |   92 | `root-declaration` | **optional**    |
| `@effect/ai-openrouter/OpenRouterLanguageModel.FileAnnotation`     |  101 | `root-declaration` | **optional**    |

## Recommended

### `@effect/ai-openrouter/OpenRouterLanguageModel.layer`

- **Source:** `packages/ai/openrouter/src/OpenRouterLanguageModel.ts:619`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer for the OpenRouter language model.
- **Signature hint:** `declare function layer(options: { readonly model: string; readonly config?: Omit<typeof Config.Service, 'model'> | undefined; }): Layer.Layer<LanguageModel.LanguageModel, never, OpenRouterClient>`
- **Import guidance:** Start from `import { OpenRouterLanguageModel } from "@effect/ai-openrouter"` and use `OpenRouterLanguageModel.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenRouterLanguageModel.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openrouter/OpenRouterLanguageModel.Config`

- **Source:** `packages/ai/openrouter/src/OpenRouterLanguageModel.ts:60`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for OpenRouter language model configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenRouterLanguageModel } from "@effect/ai-openrouter"` and use `OpenRouterLanguageModel.Config`.
- **Suggested snippet:** Consume `OpenRouterLanguageModel.Config` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openrouter/OpenRouterLanguageModel.model`

- **Source:** `packages/ai/openrouter/src/OpenRouterLanguageModel.ts:507`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OpenRouter model descriptor that can be provided with `Effect.provide`.
- **Signature hint:** `declare function model(model: string, config?: Omit<typeof Config.Service, 'model'>): AiModel.Model<'openai', LanguageModel.LanguageModel, OpenRouterClient>`
- **Import guidance:** Start from `import { OpenRouterLanguageModel } from "@effect/ai-openrouter"` and use `OpenRouterLanguageModel.model`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an OpenRouter model descriptor that can be provided with `Effect.provide`. Call `OpenRouterLanguageModel.model` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openrouter/OpenRouterLanguageModel.make`

- **Source:** `packages/ai/openrouter/src/OpenRouterLanguageModel.ts:541`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OpenRouter `LanguageModel` service from a model identifier and optional request defaults.
- **Signature hint:** `declare function make(args_0: { readonly model: string; readonly config?: Omit<typeof Config.Service, 'model'> | undefined; }): Effect.Effect<LanguageModel.Service, never, OpenRouterClient>`
- **Import guidance:** Start from `import { OpenRouterLanguageModel } from "@effect/ai-openrouter"` and use `OpenRouterLanguageModel.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenRouterLanguageModel.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openrouter/OpenRouterLanguageModel.withConfigOverride`

- **Source:** `packages/ai/openrouter/src/OpenRouterLanguageModel.ts:645`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Provides config overrides for OpenRouter language model operations.
- **Signature hint:** `declare function withConfigOverride(overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>> declare function withConfigOverride<A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>`
- **Import guidance:** Start from `import { OpenRouterLanguageModel } from "@effect/ai-openrouter"` and use `OpenRouterLanguageModel.withConfigOverride`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenRouterLanguageModel.withConfigOverride`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-openrouter/OpenRouterLanguageModel.ReasoningDetails`

- **Source:** `packages/ai/openrouter/src/OpenRouterLanguageModel.ts:92`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenRouter assistant reasoning detail blocks preserved for multi-turn conversations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openrouter/OpenRouterLanguageModel.ReasoningDetails`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterLanguageModel.FileAnnotation`

- **Source:** `packages/ai/openrouter/src/OpenRouterLanguageModel.ts:101`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** File annotations emitted on OpenRouter assistant messages and exposed in finish metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openrouter/OpenRouterLanguageModel.FileAnnotation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

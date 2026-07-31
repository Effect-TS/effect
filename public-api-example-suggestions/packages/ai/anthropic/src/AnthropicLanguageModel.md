# Example Suggestions: `@effect/ai-anthropic/AnthropicLanguageModel`

- **Package:** `@effect/ai-anthropic`
- **Source:** `packages/ai/anthropic/src/AnthropicLanguageModel.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 5 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                        | Line | Kind               | Priority        |
| -------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/ai-anthropic/AnthropicLanguageModel.layer`                        |  758 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicLanguageModel.Config`                       |   71 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicLanguageModel.model`                        |  636 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicLanguageModel.make`                         |  662 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicLanguageModel.withConfigOverride`           |  784 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicLanguageModel.AnthropicUserDefinedTool`     | 1226 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicLanguageModel.AnthropicProviderDefinedTool` | 1239 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicLanguageModel.Model`                        |   48 | `root-declaration` | **optional**    |

## Recommended

### `@effect/ai-anthropic/AnthropicLanguageModel.layer`

- **Source:** `packages/ai/anthropic/src/AnthropicLanguageModel.ts:758`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer for the Anthropic language model.
- **Signature hint:** `declare function layer(options: { readonly model: (string & {}) | Model; readonly config?: Omit<typeof Config.Service, 'model'> | undefined; }): Layer.Layer<LanguageModel.LanguageModel, never, AnthropicClient>`
- **Import guidance:** Start from `import { AnthropicLanguageModel } from "@effect/ai-anthropic"` and use `AnthropicLanguageModel.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `AnthropicLanguageModel.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicLanguageModel.Config`

- **Source:** `packages/ai/anthropic/src/AnthropicLanguageModel.ts:71`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Context service for Anthropic language model configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicLanguageModel } from "@effect/ai-anthropic"` and use `AnthropicLanguageModel.Config`.
- **Suggested snippet:** Consume `AnthropicLanguageModel.Config` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicLanguageModel.model`

- **Source:** `packages/ai/anthropic/src/AnthropicLanguageModel.ts:636`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an Anthropic model descriptor that can be provided with `Effect.provide`.
- **Signature hint:** `declare function model(model: (string & {}) | Model, config?: Omit<typeof Config.Service, 'model'>): AiModel.Model<'anthropic', LanguageModel.LanguageModel, AnthropicClient>`
- **Import guidance:** Start from `import { AnthropicLanguageModel } from "@effect/ai-anthropic"` and use `AnthropicLanguageModel.model`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an Anthropic model descriptor that can be provided with `Effect.provide`. Call `AnthropicLanguageModel.model` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicLanguageModel.make`

- **Source:** `packages/ai/anthropic/src/AnthropicLanguageModel.ts:662`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an Anthropic `LanguageModel` service from a model identifier and optional request defaults.
- **Signature hint:** `declare function make(args_0: { readonly model: (string & {}) | Model; readonly config?: Omit<typeof Config.Service, 'model'> | undefined; }): Effect.Effect<LanguageModel.Service, never, AnthropicClient>`
- **Import guidance:** Start from `import { AnthropicLanguageModel } from "@effect/ai-anthropic"` and use `AnthropicLanguageModel.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `AnthropicLanguageModel.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicLanguageModel.withConfigOverride`

- **Source:** `packages/ai/anthropic/src/AnthropicLanguageModel.ts:784`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Provides config overrides for Anthropic language model operations.
- **Signature hint:** `declare function withConfigOverride(overrides: typeof Config.Service): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, Exclude<R, Config>> declare function withConfigOverride<A, E, R>(self: Effect.Effect<A, E, R>, overrides: typeof Config.Service): Effect.Effect<A, E, Exclude<R, Config>>`
- **Import guidance:** Start from `import { AnthropicLanguageModel } from "@effect/ai-anthropic"` and use `AnthropicLanguageModel.withConfigOverride`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `AnthropicLanguageModel.withConfigOverride`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-anthropic/AnthropicLanguageModel.AnthropicUserDefinedTool`

- **Source:** `packages/ai/anthropic/src/AnthropicLanguageModel.ts:1226`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **optional**
- **Current description:** Encoded Anthropic custom tool definition that can be sent in a Messages API request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicLanguageModel.AnthropicUserDefinedTool`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicLanguageModel.AnthropicProviderDefinedTool`

- **Source:** `packages/ai/anthropic/src/AnthropicLanguageModel.ts:1239`
- **Kind / category:** `root-declaration` / `tools`
- **Priority:** **optional**
- **Current description:** Represents a provider-defined tool that can be passed to the Anthropic API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicLanguageModel.AnthropicProviderDefinedTool`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicLanguageModel.Model`

- **Source:** `packages/ai/anthropic/src/AnthropicLanguageModel.ts:48`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Known Anthropic Claude model identifiers exposed by the generated Anthropic schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicLanguageModel.Model`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

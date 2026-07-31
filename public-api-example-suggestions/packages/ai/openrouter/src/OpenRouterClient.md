# Example Suggestions: `@effect/ai-openrouter/OpenRouterClient`

- **Package:** `@effect/ai-openrouter`
- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 4 recommended, 6 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                     | Line | Kind               | Priority        |
| ----------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/ai-openrouter/OpenRouterClient.layer`                          |  282 | `root-declaration` | **recommended** |
| `@effect/ai-openrouter/OpenRouterClient.layerConfig`                    |  305 | `root-declaration` | **recommended** |
| `@effect/ai-openrouter/OpenRouterClient.OpenRouterClient`               |   96 | `root-declaration` | **recommended** |
| `@effect/ai-openrouter/OpenRouterClient.make`                           |  166 | `root-declaration` | **recommended** |
| `@effect/ai-openrouter/OpenRouterClient.Options`                        |  111 | `root-declaration` | **optional**    |
| `@effect/ai-openrouter/OpenRouterClient.Service`                        |   43 | `root-declaration` | **optional**    |
| `@effect/ai-openrouter/OpenRouterClient.ChatStreamingResponseChunkData` |   75 | `root-declaration` | **optional**    |
| `@effect/ai-openrouter/OpenRouterClient.Options.siteReferrer`           |  119 | `member`           | **optional**    |
| `@effect/ai-openrouter/OpenRouterClient.Options.siteTitle`              |  124 | `member`           | **optional**    |
| `@effect/ai-openrouter/OpenRouterClient.Options.transformClient`        |  133 | `member`           | **optional**    |

## Recommended

### `@effect/ai-openrouter/OpenRouterClient.layer`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:282`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer for the OpenRouter client with the given options.
- **Signature hint:** `declare function layer(options: Options): Layer.Layer<OpenRouterClient, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OpenRouterClient } from "@effect/ai-openrouter"` and use `OpenRouterClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenRouterClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openrouter/OpenRouterClient.layerConfig`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:305`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer for the OpenRouter client from provided `Config` values.
- **Signature hint:** `declare function layerConfig(options?: { readonly apiKey?: Config.Config<Redacted.Redacted<string> | undefined> | undefined; readonly apiUrl?: Config.Config<string> | undefined; readonly siteReferrer?: Config.Config<string> | undefined; readonly siteTitle?: Config.Config<string> | undefined; readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined; }): Layer.Layer<OpenRouterClient, Config.ConfigError, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OpenRouterClient } from "@effect/ai-openrouter"` and use `OpenRouterClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenRouterClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openrouter/OpenRouterClient.OpenRouterClient`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:96`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the OpenRouter client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenRouterClient } from "@effect/ai-openrouter"` and use `OpenRouterClient.OpenRouterClient`.
- **Suggested snippet:** Consume `OpenRouterClient.OpenRouterClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openrouter/OpenRouterClient.make`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:166`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OpenRouter client service from explicit options.
- **Signature hint:** `declare function make(options: Options): Effect.Effect<Service, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OpenRouterClient } from "@effect/ai-openrouter"` and use `OpenRouterClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenRouterClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-openrouter/OpenRouterClient.Options`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:111`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Configuration for creating an OpenRouter client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openrouter/OpenRouterClient.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterClient.Service`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:43`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The OpenRouter client service interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openrouter/OpenRouterClient.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterClient.ChatStreamingResponseChunkData`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:75`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded `data` payload from an OpenRouter chat completion streaming chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openrouter/OpenRouterClient.ChatStreamingResponseChunkData`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterClient.Options.siteReferrer`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:119`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional URL of your site for rankings on `openrouter.ai`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openrouter/OpenRouterClient.Options.siteReferrer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterClient.Options.siteTitle`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:124`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional title of your site for rankings on `openrouter.ai`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openrouter/OpenRouterClient.Options.siteTitle` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterClient.Options.transformClient`

- **Source:** `packages/ai/openrouter/src/OpenRouterClient.ts:133`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional transformer for the underlying HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openrouter/OpenRouterClient.Options.transformClient` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

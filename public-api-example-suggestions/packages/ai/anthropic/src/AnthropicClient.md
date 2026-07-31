# Example Suggestions: `@effect/ai-anthropic/AnthropicClient`

- **Package:** `@effect/ai-anthropic`
- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts`
- **Uncovered API records:** 15
- **Priorities:** 0 required, 4 recommended, 11 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/ai-anthropic/AnthropicClient.layer`                       |  372 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicClient.layerConfig`                 |  391 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicClient.AnthropicClient`             |  132 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicClient.make`                        |  222 | `root-declaration` | **recommended** |
| `@effect/ai-anthropic/AnthropicClient.Options`                     |  161 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.Service`                     |   42 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.Service.client`              |   46 | `member`           | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.Service.streamRequest`       |   51 | `member`           | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.Service.createMessage`       |   62 | `member`           | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.Service.createMessageStream` |   78 | `member`           | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.MessageStreamEvent`          |  104 | `root-declaration` | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.Options.apiKey`              |  166 | `member`           | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.Options.apiUrl`              |  173 | `member`           | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.Options.apiVersion`          |  180 | `member`           | **optional**    |
| `@effect/ai-anthropic/AnthropicClient.Options.transformClient`     |  186 | `member`           | **optional**    |

## Recommended

### `@effect/ai-anthropic/AnthropicClient.layer`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:372`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer for the Anthropic client with the given options.
- **Signature hint:** `declare function layer(options: Options): Layer.Layer<AnthropicClient, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { AnthropicClient } from "@effect/ai-anthropic"` and use `AnthropicClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `AnthropicClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicClient.layerConfig`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:391`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer for the Anthropic client, loading the requisite configuration via Effect's `Config` module.
- **Signature hint:** `declare function layerConfig(options?: { readonly apiKey?: Config.Config<Redacted.Redacted<string> | undefined> | undefined; readonly apiUrl?: Config.Config<string> | undefined; readonly apiVersion?: Config.Config<string> | undefined; readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined; }): Layer.Layer<AnthropicClient, Config.ConfigError, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { AnthropicClient } from "@effect/ai-anthropic"` and use `AnthropicClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `AnthropicClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicClient.AnthropicClient`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:132`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the Anthropic client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AnthropicClient } from "@effect/ai-anthropic"` and use `AnthropicClient.AnthropicClient`.
- **Suggested snippet:** Consume `AnthropicClient.AnthropicClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-anthropic/AnthropicClient.make`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:222`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an Anthropic client service with the given options.
- **Signature hint:** `declare function make(options: Options): Effect.Effect<Service, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { AnthropicClient } from "@effect/ai-anthropic"` and use `AnthropicClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `AnthropicClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-anthropic/AnthropicClient.Options`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:161`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Configuration for creating an Anthropic client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicClient.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.Service`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:42`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the Anthropic client service with methods for the Messages API, including regular and streaming message creation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicClient.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.Service.client`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:46`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The underlying generated Anthropic client that exposes all API endpoints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicClient.Service.client` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.Service.streamRequest`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:51`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Executes a low-level streaming HTTP request and decodes the Server-Sent Events response using the provided schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicClient.Service.streamRequest` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.Service.createMessage`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:62`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a message using the Anthropic Messages API and maps all errors to the unified `AiError` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicClient.Service.createMessage` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.Service.createMessageStream`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:78`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a streaming message using the Anthropic Messages API and maps all errors to the unified `AiError` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicClient.Service.createMessageStream` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.MessageStreamEvent`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:104`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an event received from the Anthropic Messages API during a streaming request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicClient.MessageStreamEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.Options.apiKey`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:166`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The Anthropic API key for authentication. Requests are made without authentication when this is omitted, which is useful for proxied setups or testing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicClient.Options.apiKey` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.Options.apiUrl`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:173`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The base URL for the Anthropic API. Override this to use a proxy or a different API-compatible endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicClient.Options.apiUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.Options.apiVersion`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:180`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The Anthropic API version header value. This controls which version of the API to use.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicClient.Options.apiVersion` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicClient.Options.transformClient`

- **Source:** `packages/ai/anthropic/src/AnthropicClient.ts:186`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional transformer for the underlying HTTP client, such as middleware, logging, or custom request/response handling.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicClient.Options.transformClient` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

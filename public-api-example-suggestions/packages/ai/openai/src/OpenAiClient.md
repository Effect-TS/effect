# Example Suggestions: `@effect/ai-openai/OpenAiClient`

- **Package:** `@effect/ai-openai`
- **Source:** `packages/ai/openai/src/OpenAiClient.ts`
- **Uncovered API records:** 19
- **Priorities:** 0 required, 7 recommended, 12 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/ai-openai/OpenAiClient.layer`                        |  355 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiClient.layerConfig`                  |  378 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiClient.layerWebSocketMode`           |  739 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiClient.OpenAiClient`                 |  109 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiClient.make`                         |  191 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiClient.OpenAiSocket`                 |  466 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiClient.withWebSocketMode`            |  702 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiClient.ResponseStreamEvent`          |  439 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiClient.Options`                      |  123 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiClient.Service`                      |   53 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiClient.Service.client`               |   57 | `member`           | **optional**    |
| `@effect/ai-openai/OpenAiClient.Service.createResponse`       |   62 | `member`           | **optional**    |
| `@effect/ai-openai/OpenAiClient.Service.createResponseStream` |   72 | `member`           | **optional**    |
| `@effect/ai-openai/OpenAiClient.Service.createEmbedding`      |   85 | `member`           | **optional**    |
| `@effect/ai-openai/OpenAiClient.Options.apiKey`               |  127 | `member`           | **optional**    |
| `@effect/ai-openai/OpenAiClient.Options.apiUrl`               |  134 | `member`           | **optional**    |
| `@effect/ai-openai/OpenAiClient.Options.organizationId`       |  139 | `member`           | **optional**    |
| `@effect/ai-openai/OpenAiClient.Options.projectId`            |  144 | `member`           | **optional**    |
| `@effect/ai-openai/OpenAiClient.Options.transformClient`      |  149 | `member`           | **optional**    |

## Recommended

### `@effect/ai-openai/OpenAiClient.layer`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:355`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer for the OpenAI client with the given options.
- **Signature hint:** `declare function layer(options: Options): Layer.Layer<OpenAiClient, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai"` and use `OpenAiClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenAiClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiClient.layerConfig`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:378`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer for the OpenAI client from provided `Config` values.
- **Signature hint:** `declare function layerConfig(options?: { readonly apiKey?: Config.Config<Redacted.Redacted<string> | undefined> | undefined; readonly apiUrl?: Config.Config<string> | undefined; readonly organizationId?: Config.Config<Redacted.Redacted<string> | undefined> | undefined; readonly projectId?: Config.Config<Redacted.Redacted<string> | undefined> | undefined; readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined; }): Layer.Layer<OpenAiClient, Config.ConfigError, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai"` and use `OpenAiClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenAiClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiClient.layerWebSocketMode`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:739`
- **Kind / category:** `root-declaration` / `Websocket mode`
- **Priority:** **recommended**
- **Current description:** Uses OpenAI's websocket mode for all responses that use the Layer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai"` and use `OpenAiClient.layerWebSocketMode`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenAiClient.layerWebSocketMode`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiClient.OpenAiClient`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:109`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the OpenAI client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai"` and use `OpenAiClient.OpenAiClient`.
- **Suggested snippet:** Consume `OpenAiClient.OpenAiClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiClient.make`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:191`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an OpenAI client service with the given options.
- **Signature hint:** `declare function make(options: Options): Effect.Effect<Service, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai"` and use `OpenAiClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenAiClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiClient.OpenAiSocket`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:466`
- **Kind / category:** `root-declaration` / `Websocket mode`
- **Priority:** **recommended**
- **Current description:** Service for creating OpenAI response streams over a WebSocket connection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai"` and use `OpenAiClient.OpenAiSocket`.
- **Suggested snippet:** Consume `OpenAiClient.OpenAiSocket` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiClient.withWebSocketMode`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:702`
- **Kind / category:** `root-declaration` / `Websocket mode`
- **Priority:** **recommended**
- **Current description:** Uses OpenAI's WebSocket mode for response streams within the provided effect.
- **Signature hint:** `declare function withWebSocketMode<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, Exclude<R, OpenAiSocket | ResponseIdTracker.ResponseIdTracker> | OpenAiClient | Socket.WebSocketConstructor>`
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai"` and use `OpenAiClient.withWebSocketMode`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenAiClient.withWebSocketMode`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-openai/OpenAiClient.ResponseStreamEvent`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:439`
- **Kind / category:** `root-declaration` / `Events`
- **Priority:** **optional**
- **Current description:** Response stream event emitted by the OpenAI Responses API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiClient.ResponseStreamEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Options`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:123`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for configuring the OpenAI client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiClient.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Service`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:53`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect service interface for the handwritten OpenAI client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiClient.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Service.client`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:57`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The transformed HTTP client used by this service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiClient.Service.client` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Service.createResponse`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:62`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a response using the OpenAI responses endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiClient.Service.createResponse` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Service.createResponseStream`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:72`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a streaming response using the OpenAI responses endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiClient.Service.createResponseStream` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Service.createEmbedding`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:85`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create embeddings using the OpenAI embeddings endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiClient.Service.createEmbedding` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Options.apiKey`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:127`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The OpenAI API key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiClient.Options.apiKey` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Options.apiUrl`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:134`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The base URL for the OpenAI API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiClient.Options.apiUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Options.organizationId`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:139`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional organization ID for multi-org accounts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiClient.Options.organizationId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Options.projectId`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:144`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional project ID for project-scoped requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiClient.Options.projectId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiClient.Options.transformClient`

- **Source:** `packages/ai/openai/src/OpenAiClient.ts:149`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional transformer for the HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai/OpenAiClient.Options.transformClient` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

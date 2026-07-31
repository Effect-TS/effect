# Example Suggestions: `@effect/ai-openai-compat/OpenAiClient`

- **Package:** `@effect/ai-openai-compat`
- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts`
- **Uncovered API records:** 42
- **Priorities:** 0 required, 4 recommended, 38 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                     | Line | Kind               | Priority        |
| ----------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/ai-openai-compat/OpenAiClient.layer`                           |  294 | `root-declaration` | **recommended** |
| `@effect/ai-openai-compat/OpenAiClient.layerConfig`                     |  318 | `root-declaration` | **recommended** |
| `@effect/ai-openai-compat/OpenAiClient.OpenAiClient`                    |   83 | `root-declaration` | **recommended** |
| `@effect/ai-openai-compat/OpenAiClient.make`                            |  136 | `root-declaration` | **recommended** |
| `@effect/ai-openai-compat/OpenAiClient.Response`                        |  716 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.TextResponseFormatConfiguration` |  633 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.UnknownChatCompletionEvent`      | 1210 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.Options`                         |   93 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.IncludeEnum`                     |  358 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.InputContent`                    |  397 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.SummaryTextContent`              |  405 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.Annotation`                      |  467 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ReasoningItem`                   |  506 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.InputItem`                       |  563 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.Tool`                            |  604 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.CreateResponse`                  |  655 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ResponseUsage`                   |  695 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ResponseStreamEvent`             |  845 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.Embedding`                       |  873 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.CreateEmbeddingRequest`          |  885 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.CreateEmbeddingResponse`         |  899 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.CreateEmbeddingRequestJson`      |  915 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.CreateEmbedding200`              |  922 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionContentPart`       |  929 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionRequestToolCall`   |  947 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionRequestMessage`    |  961 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionTool`              |  978 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionToolChoice`        |  993 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionResponseFormat`    | 1009 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionRequest`           | 1028 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.CreateResponseRequestJson`       | 1054 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.CreateResponse200`               | 1061 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.CreateResponse200Sse`            | 1068 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionToolCall`          | 1168 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionMessage`           | 1175 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionChoice`            | 1182 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionUsage`             | 1189 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionResponse`          | 1196 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionChunk`             | 1203 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.ChatCompletionStreamEvent`       | 1221 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.Service`                         |   40 | `root-declaration` | **optional**    |
| `@effect/ai-openai-compat/OpenAiClient.MessageStatus`                   |  369 | `root-declaration` | **optional**    |

## Recommended

### `@effect/ai-openai-compat/OpenAiClient.layer`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:294`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that provides an OpenAI-compatible client from explicit options.
- **Signature hint:** `declare function layer(options: Options): Layer.Layer<OpenAiClient, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai-compat"` and use `OpenAiClient.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenAiClient.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai-compat/OpenAiClient.layerConfig`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:318`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that loads OpenAI-compatible client settings from `Config` values before constructing the service.
- **Signature hint:** `declare function layerConfig(options?: { readonly apiKey?: Config.Config<Redacted.Redacted<string> | undefined> | undefined; readonly apiUrl?: Config.Config<string> | undefined; readonly organizationId?: Config.Config<Redacted.Redacted<string> | undefined> | undefined; readonly projectId?: Config.Config<Redacted.Redacted<string> | undefined> | undefined; readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined; }): Layer.Layer<OpenAiClient, Config.ConfigError, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai-compat"` and use `OpenAiClient.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `OpenAiClient.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai-compat/OpenAiClient.OpenAiClient`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:83`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the OpenAI-compatible chat completions and embeddings client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai-compat"` and use `OpenAiClient.OpenAiClient`.
- **Suggested snippet:** Consume `OpenAiClient.OpenAiClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai-compat/OpenAiClient.make`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:136`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs an OpenAI-compatible client service from explicit options.
- **Signature hint:** `declare function make(options: Options): Effect.Effect<Service, never, HttpClient.HttpClient>`
- **Import guidance:** Start from `import { OpenAiClient } from "@effect/ai-openai-compat"` and use `OpenAiClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `OpenAiClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-openai-compat/OpenAiClient.Response`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:716`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Responses-style response object returned by compatible providers or embedded in response stream lifecycle events.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.Response`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.TextResponseFormatConfiguration`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:633`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Text output format configuration for plain text, JSON object, or JSON Schema responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.TextResponseFormatConfiguration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.UnknownChatCompletionEvent`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1210`
- **Kind / category:** `root-declaration` / `streaming`
- **Priority:** **optional**
- **Current description:** A parsed chat completion event that does not match the expected chunk schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.UnknownChatCompletionEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.Options`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:93`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Configuration options used to construct an OpenAI-compatible client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.IncludeEnum`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:358`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Optional response fields that can be requested with the `include` parameter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.IncludeEnum`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.InputContent`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:397`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Content blocks accepted in input messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.InputContent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.SummaryTextContent`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:405`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Text content block used for model-provided reasoning summaries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.SummaryTextContent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.Annotation`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:467`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Citation and file-path annotations attached to output text content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.Annotation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ReasoningItem`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:506`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Reasoning output item containing encrypted reasoning content, summaries, and optional reasoning text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ReasoningItem`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.InputItem`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:563`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Item shapes accepted by a Responses-style `input` field.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.InputItem`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.Tool`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:604`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Tool definitions that can be supplied to a Responses-style request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.Tool`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.CreateResponse`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:655`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Request options for creating a Responses-style response with an OpenAI-compatible provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.CreateResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ResponseUsage`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:695`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Token accounting reported on Responses-style response objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ResponseUsage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ResponseStreamEvent`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:845`
- **Kind / category:** `root-declaration` / `streaming`
- **Priority:** **optional**
- **Current description:** Server-sent event shapes emitted by Responses-style response streams.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ResponseStreamEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.Embedding`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:873`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Represents one embedding item returned by an OpenAI-compatible embeddings API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.Embedding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.CreateEmbeddingRequest`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:885`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Request payload for the embeddings endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.CreateEmbeddingRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.CreateEmbeddingResponse`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:899`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Successful response payload returned by the embeddings endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.CreateEmbeddingResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.CreateEmbeddingRequestJson`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:915`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** JSON request body accepted by the embeddings endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.CreateEmbeddingRequestJson`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.CreateEmbedding200`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:922`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Decoded successful embeddings response body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.CreateEmbedding200`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionContentPart`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:929`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Structured content parts accepted in chat completion messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionContentPart`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionRequestToolCall`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:947`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Tool call data attached to an assistant chat completion message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionRequestToolCall`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionRequestMessage`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:961`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Message shapes accepted by the chat completions endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionRequestMessage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionTool`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:978`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Function tool definition accepted by the chat completions endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionTool`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionToolChoice`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:993`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Controls whether the model may call tools and can force a specific function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionToolChoice`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionResponseFormat`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1009`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** JSON response format configuration for chat completion requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionResponseFormat`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionRequest`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1028`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Request payload for the OpenAI-compatible chat completions endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.CreateResponseRequestJson`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1054`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** JSON request body used by this client when creating a chat completion response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.CreateResponseRequestJson`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.CreateResponse200`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1061`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Decoded successful chat completion response body returned by `createResponse`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.CreateResponse200`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.CreateResponse200Sse`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1068`
- **Kind / category:** `root-declaration` / `streaming`
- **Priority:** **optional**
- **Current description:** Decoded server-sent event payload emitted by `createResponseStream`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.CreateResponse200Sse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionToolCall`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1168`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Decoded tool-call object from a chat completion response or streaming chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionToolCall`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionMessage`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1175`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Decoded message object from a non-streaming chat completion choice.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionMessage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionChoice`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1182`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Decoded choice object returned by chat completion responses and chunks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionChoice`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionUsage`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1189`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Decoded token usage summary returned by chat completions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionUsage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionResponse`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1196`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Decoded successful response from the chat completions endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionChunk`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1203`
- **Kind / category:** `root-declaration` / `streaming`
- **Priority:** **optional**
- **Current description:** Decoded streaming chunk emitted by the chat completions endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionChunk`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.ChatCompletionStreamEvent`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:1221`
- **Kind / category:** `root-declaration` / `streaming`
- **Priority:** **optional**
- **Current description:** Streaming chat completion event, including decoded chunks, unknown parsed events, and the `[DONE]` sentinel.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.ChatCompletionStreamEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.Service`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:40`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect service interface for OpenAI-compatible chat completions and embeddings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiClient.MessageStatus`

- **Source:** `packages/ai/openai-compat/src/OpenAiClient.ts:369`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Lifecycle status shared by message, reasoning, and tool-call items.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiClient.MessageStatus`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

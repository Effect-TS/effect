# Example Suggestions: `@effect/ai-openai/OpenAiSchema`

- **Package:** `@effect/ai-openai`
- **Source:** `packages/ai/openai/src/OpenAiSchema.ts`
- **Uncovered API records:** 35
- **Priorities:** 0 required, 5 recommended, 30 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                      | Line | Kind               | Priority        |
| ------------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/ai-openai/OpenAiSchema.MessageStatus (value)`                   |   62 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiSchema.IncludeEnum (value)`                     |   35 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiSchema.InputContent (value)`                    |  108 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiSchema.Tool (value)`                            |  509 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiSchema.ToolChoice (value)`                      |  542 | `root-declaration` | **recommended** |
| `@effect/ai-openai/OpenAiSchema.SummaryTextContent (value)`              |  139 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.Annotation (value)`                      |  214 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.ReasoningItem (value)`                   |  285 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.InputItem (value)`                       |  417 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.TextResponseFormatConfiguration (value)` |  610 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.CreateResponse (value)`                  |  655 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.CreateResponse (type)`                   |  703 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.ResponseUsage (value)`                   |  717 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.Response (value)`                        |  852 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.ResponseStreamEvent (value)`             | 1106 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.Embedding (value)`                       | 1167 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.CreateEmbeddingRequest (value)`          | 1212 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.CreateEmbeddingResponse (value)`         | 1259 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.IncludeEnum (type)`                      |   49 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.MessageStatus (type)`                    |   74 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.InputContent (type)`                     |  124 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.SummaryTextContent (type)`               |  150 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.Annotation (type)`                       |  232 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.ReasoningItem (type)`                    |  315 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.InputItem (type)`                        |  448 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.Tool (type)`                             |  521 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.ToolChoice (type)`                       |  586 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.TextResponseFormatConfiguration (type)`  |  628 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.ResponseUsage (type)`                    |  739 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.Response (type)`                         |  886 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.UnknownResponseStreamEvent`              | 1066 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.ResponseStreamEvent (type)`              | 1144 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.Embedding (type)`                        | 1187 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.CreateEmbeddingRequest (type)`           | 1231 | `root-declaration` | **optional**    |
| `@effect/ai-openai/OpenAiSchema.CreateEmbeddingResponse (type)`          | 1286 | `root-declaration` | **optional**    |

## Recommended

### `@effect/ai-openai/OpenAiSchema.MessageStatus (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:62`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for lifecycle statuses shared by messages, reasoning items, and tool calls.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.MessageStatus`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.MessageStatus`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiSchema.IncludeEnum (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:35`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for optional `include` values supported by the local handwritten Responses client schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.IncludeEnum`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.IncludeEnum`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiSchema.InputContent (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:108`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for content blocks accepted in OpenAI Responses input messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.InputContent`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.InputContent`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiSchema.Tool (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:509`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for tool definitions that can be supplied to an OpenAI Responses request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.Tool`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.Tool`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-openai/OpenAiSchema.ToolChoice (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:542`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for selecting whether and which tools the model may call in a Responses request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.ToolChoice`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.ToolChoice`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-openai/OpenAiSchema.SummaryTextContent (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:139`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a text block containing a model-provided reasoning summary.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.SummaryTextContent`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.SummaryTextContent`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.Annotation (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:214`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for citation and file-path annotations attached to output text content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.Annotation`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.Annotation`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.ReasoningItem (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:285`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a reasoning output item containing encrypted content, summaries, and optional reasoning text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.ReasoningItem`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.ReasoningItem`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.InputItem (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:417`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for item shapes accepted by an OpenAI Responses request `input` field.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.InputItem`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.InputItem`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.TextResponseFormatConfiguration (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:610`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for text output format configuration, including plain text, JSON object, and JSON Schema responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.TextResponseFormatConfiguration`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.TextResponseFormatConfiguration`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.CreateResponse (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:655`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for request options used to create an OpenAI Responses API response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.CreateResponse`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.CreateResponse`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.CreateResponse (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:703`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Request options used to create an OpenAI Responses API response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.CreateResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.ResponseUsage (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:717`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for token accounting reported on OpenAI Responses API response objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.ResponseUsage`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.ResponseUsage`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.Response (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:852`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for an OpenAI Responses API response object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.Response`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.Response`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.ResponseStreamEvent (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:1106`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for server-sent event shapes emitted by OpenAI Responses API streams.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.ResponseStreamEvent`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.ResponseStreamEvent`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.Embedding (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:1167`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for one embedding item returned by the OpenAI embeddings API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.Embedding`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.Embedding`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.CreateEmbeddingRequest (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:1212`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for the request payload sent to the OpenAI embeddings endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.CreateEmbeddingRequest`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.CreateEmbeddingRequest`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.CreateEmbeddingResponse (value)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:1259`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a successful response payload returned by the OpenAI embeddings endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenAiSchema } from "@effect/ai-openai"` and use `OpenAiSchema.CreateEmbeddingResponse`.
- **Suggested snippet:** Define the smallest domain Schema involving `OpenAiSchema.CreateEmbeddingResponse`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.IncludeEnum (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:49`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type of optional `include` values accepted by OpenAI Responses requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.IncludeEnum`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.MessageStatus (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:74`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Lifecycle status shared by messages, reasoning items, and tool calls.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.MessageStatus`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.InputContent (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:124`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Content block accepted in OpenAI Responses input messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.InputContent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.SummaryTextContent (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:150`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Text content block used for model-provided reasoning summaries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.SummaryTextContent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.Annotation (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:232`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Citation or file-path annotation attached to output text content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.Annotation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.ReasoningItem (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:315`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Reasoning output item containing encrypted content, summaries, and optional reasoning text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.ReasoningItem`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.InputItem (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:448`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Item shape accepted by an OpenAI Responses request `input` field.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.InputItem`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.Tool (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:521`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tool definition that can be supplied to an OpenAI Responses request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.Tool`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.ToolChoice (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:586`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tool selection mode or named tool choice for a Responses request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.ToolChoice`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.TextResponseFormatConfiguration (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:628`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Text output format configuration for plain text, JSON object, or JSON Schema responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.TextResponseFormatConfiguration`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.ResponseUsage (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:739`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Token accounting reported on OpenAI Responses API response objects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.ResponseUsage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.Response (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:886`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAI Responses API response object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.Response`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.UnknownResponseStreamEvent`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:1066`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Fallback event shape for future or provider-specific response stream events.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.UnknownResponseStreamEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.ResponseStreamEvent (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:1144`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Server-sent event shape emitted by OpenAI Responses API streams.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.ResponseStreamEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.Embedding (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:1187`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** One embedding item returned by the OpenAI embeddings API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.Embedding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.CreateEmbeddingRequest (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:1231`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Request payload sent to the OpenAI embeddings endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.CreateEmbeddingRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai/OpenAiSchema.CreateEmbeddingResponse (type)`

- **Source:** `packages/ai/openai/src/OpenAiSchema.ts:1286`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Successful response payload returned by the OpenAI embeddings endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai/OpenAiSchema.CreateEmbeddingResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

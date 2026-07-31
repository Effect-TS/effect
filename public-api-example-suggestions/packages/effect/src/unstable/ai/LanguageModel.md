# Example Suggestions: `effect/unstable/ai/LanguageModel`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts`
- **Uncovered API records:** 38
- **Priorities:** 0 required, 2 recommended, 36 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                              | Line | Kind               | Priority        |
| -------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/LanguageModel.defaultCodecTransformer`                       |  237 | `root-declaration` | **recommended** |
| `effect/unstable/ai/LanguageModel.make`                                          |  748 | `root-declaration` | **recommended** |
| `effect/unstable/ai/LanguageModel.GenerateTextOptions`                           |  245 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateObjectOptions`                         |  303 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.ProviderOptions`                               |  651 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.Service`                                       |   95 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.Service.generateText`                          |   99 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.Service.generateObject`                        |  139 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.Service.streamText`                            |  158 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.CodecTransformer`                              |  211 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextOptions.prompt`                    |  249 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextOptions.toolkit`                   |  255 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextOptions.toolChoice`                |  272 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextOptions.concurrency`               |  279 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextOptions.disableToolCallResolution` |  290 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateObjectOptions.objectName`              |  311 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateObjectOptions.schema`                  |  316 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.ToolChoice`                                    |  337 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextResponse.text`                     |  377 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextResponse.reasoning`                |  390 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextResponse.reasoningText`            |  397 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextResponse.toolCalls`                |  410 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextResponse.toolResults`              |  417 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextResponse.finishReason`             |  424 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateTextResponse.usage`                    |  432 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.GenerateObjectResponse.value`                  |  480 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.ToolkitOption`                                 |  498 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.ToolkitInput`                                  |  524 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.ExtractTools`                                  |  551 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.ExtractError`                                  |  605 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.ExtractServices`                               |  627 | `root-declaration` | **optional**    |
| `effect/unstable/ai/LanguageModel.ProviderOptions.prompt`                        |  655 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.ProviderOptions.tools`                         |  661 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.ProviderOptions.responseFormat`                |  673 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.ProviderOptions.toolChoice`                    |  698 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.ProviderOptions.span`                          |  703 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.ProviderOptions.previousResponseId`            |  708 | `member`           | **optional**    |
| `effect/unstable/ai/LanguageModel.ProviderOptions.incrementalPrompt`             |  713 | `member`           | **optional**    |

## Recommended

### `effect/unstable/ai/LanguageModel.defaultCodecTransformer`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:237`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** The default codec transformer that passes schemas through without provider-specific rewrites.
- **Signature hint:** `declare function defaultCodecTransformer<T, E, RD, RE>(schema: Schema.ConstraintCodec<T, E, RD, RE>): { readonly codec: Schema.ConstraintCodec<T, unknown, RD, RE>; readonly jsonSchema: JsonSchema.JsonSchema; }`
- **Import guidance:** Start from `import { LanguageModel } from "effect/unstable/ai"` and use `LanguageModel.defaultCodecTransformer`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: The default codec transformer that passes schemas through without provider-specific rewrites. Call `LanguageModel.defaultCodecTransformer` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/LanguageModel.make`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:748`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a LanguageModel service from provider-specific text generation and streaming implementations.
- **Signature hint:** `declare function make(params: { readonly generateText: (options: ProviderOptions) => Effect.Effect<Array<Response.PartEncoded>, AiError.AiError, IdGenerator>; readonly streamText: (options: ProviderOptions) => Stream.Stream<Response.StreamPartEncoded, AiError.AiError, IdGenerator>; readonly codecTransformer?: CodecTransformer | undefined; }): Effect.Effect<Service>`
- **Import guidance:** Start from `import { LanguageModel } from "effect/unstable/ai"` and use `LanguageModel.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `LanguageModel.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/LanguageModel.GenerateTextOptions`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:245`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Configuration options for text generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.GenerateTextOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateObjectOptions`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:303`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Configuration options for structured object generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.GenerateObjectOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ProviderOptions`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:651`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Configuration options passed along to language model provider implementations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.ProviderOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.Service`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:95`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The service interface for language model operations, defining the contract that all language model implementations must fulfill.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.Service`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.Service.generateText`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:99`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generate text using the language model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.Service.generateText` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.Service.generateObject`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:139`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generate a structured object from a schema using the language model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.Service.generateObject` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.Service.streamText`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:158`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Generate text using the language model with streaming output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.Service.streamText` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.CodecTransformer`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:211`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A function that transforms a `Schema.Codec` into a provider-compatible form for structured output generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.CodecTransformer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextOptions.prompt`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:249`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The prompt input to use to generate text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextOptions.prompt` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextOptions.toolkit`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:255`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A toolkit containing both the tools and the tool call handler to use to augment text generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextOptions.toolkit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextOptions.toolChoice`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:272`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The tool choice mode for the language model. - `auto` (default): The model can decide whether or not to call tools, as well as which tools to call. - `required`: The model **must** call a tool but can decide which tool will be called. - `none`: The model **must not** call a tool. - `{ tool: <tool_name> }`: The model must call the specified tool. - `{ mode?: "auto" (default) | "required", "oneOf": [<tool-names>] }`: The model is restricted to the subset of tools specified by `oneOf`. When `mode` is `"auto"` or omitted, the model can decide whether or not a tool from the allowed subset of tools can be called. When `mode` is `"required"`, the model **must** call one tool from the allowed subset of tools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextOptions.toolChoice` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextOptions.concurrency`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:279`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The concurrency level for resolving tool calls.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextOptions.concurrency` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextOptions.disableToolCallResolution`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:290`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** When set to `true`, tool calls requested by the large language model are not auto-resolved by the framework.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextOptions.disableToolCallResolution` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateObjectOptions.objectName`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:311`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The name of the structured output that should be generated. Used by some large language model providers to provide additional guidance to the model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateObjectOptions.objectName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateObjectOptions.schema`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:316`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The schema to be used to specify the structure of the object to generate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateObjectOptions.schema` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ToolChoice`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:337`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The tool choice mode for the language model. - `auto` (default): The model can decide whether or not to call tools, as well as which tools to call. - `required`: The model **must** call a tool but can decide which tool will be called. - `none`: The model **must not** call a tool. - `{ tool: <tool_name> }`: The model must call the specified tool. - `{ mode?: "auto" (default) | "required", "oneOf": [<tool-names>] }`: The model is restricted to the subset of tools specified by `oneOf`. When `mode` is `"auto"` or omitted, the model can decide whether or not a tool from the allowed subset of tools can be called. When `mode` is `"required"`, the model **must** call one tool from the allowed subset of tools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.ToolChoice`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextResponse.text`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:377`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Extracts and concatenates all text parts from the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextResponse.text` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextResponse.reasoning`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:390`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns all reasoning parts from the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextResponse.reasoning` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextResponse.reasoningText`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:397`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Extracts and concatenates all reasoning text, or undefined if none exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextResponse.reasoningText` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextResponse.toolCalls`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:410`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns all tool call parts from the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextResponse.toolCalls` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextResponse.toolResults`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:417`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns all tool result parts from the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextResponse.toolResults` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextResponse.finishReason`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:424`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The reason why text generation finished.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextResponse.finishReason` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateTextResponse.usage`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:432`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Token usage statistics for the generation request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateTextResponse.usage` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.GenerateObjectResponse.value`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:480`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The parsed structured object that conforms to the provided schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.GenerateObjectResponse.value` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ToolkitOption`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:498`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** The supported toolkit option shapes for language model operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.ToolkitOption`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ToolkitInput`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:524`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** The supported toolkit input shapes for language model operation options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.ToolkitInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ExtractTools`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:551`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Utility type that extracts the toolset from LanguageModel options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.ExtractTools`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ExtractError`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:605`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Utility type that extracts the error type from LanguageModel options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.ExtractError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ExtractServices`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:627`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Utility type that extracts the context requirements from LanguageModel options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/LanguageModel.ExtractServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ProviderOptions.prompt`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:655`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The prompt messages to use to generate text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.ProviderOptions.prompt` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ProviderOptions.tools`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:661`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The tools that the large language model will have available to provide additional information which can be incorporated into its text generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.ProviderOptions.tools` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ProviderOptions.responseFormat`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:673`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The format the response should be provided in.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.ProviderOptions.responseFormat` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ProviderOptions.toolChoice`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:698`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The tool choice mode for the language model. - `auto` (default): The model can decide whether or not to call tools, as well as which tools to call. - `required`: The model **must** call a tool but can decide which tool will be called. - `none`: The model **must not** call a tool. - `{ tool: <tool_name> }`: The model must call the specified tool. - `{ mode?: "auto" (default) | "required", "oneOf": [<tool-names>] }`: The model is restricted to the subset of tools specified by `oneOf`. When `mode` is `"auto"` or omitted, the model can decide whether or not a tool from the allowed subset of tools can be called. When `mode` is `"required"`, the model **must** call one tool from the allowed subset of tools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.ProviderOptions.toolChoice` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ProviderOptions.span`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:703`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The span to use to trace interactions with the large language model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.ProviderOptions.span` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ProviderOptions.previousResponseId`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:708`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The previous response identifier for incremental provider calls.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.ProviderOptions.previousResponseId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/LanguageModel.ProviderOptions.incrementalPrompt`

- **Source:** `packages/effect/src/unstable/ai/LanguageModel.ts:713`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The prompt reduced to messages not yet seen by the provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/LanguageModel.ProviderOptions.incrementalPrompt` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

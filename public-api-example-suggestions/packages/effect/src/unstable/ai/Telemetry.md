# Example Suggestions: `effect/unstable/ai/Telemetry`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts`
- **Uncovered API records:** 30
- **Priorities:** 0 required, 1 recommended, 29 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                     | Line | Kind               | Priority        |
| ----------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/Telemetry.CurrentSpanTransformer`                   |  540 | `root-declaration` | **recommended** |
| `effect/unstable/ai/Telemetry.GenAITelemetryAttributes`                 |   34 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.AllAttributes`                            |   49 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.BaseAttributes`                           |   64 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.BaseAttributes.system`                    |   69 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.OperationAttributes`                      |   79 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.TokenAttributes`                          |   90 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.UsageAttributes`                          |  101 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes`                        |  113 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.model`                  |  117 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.temperature`            |  121 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.topK`                   |  125 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.topP`                   |  129 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.maxTokens`              |  133 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.encodingFormats`        |  137 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.stopSequences`          |  142 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.frequencyPenalty`       |  146 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.presencePenalty`        |  150 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.RequestAttributes.seed`                   |  155 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.ResponseAttributes`                       |  165 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.ResponseAttributes.id`                    |  169 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.ResponseAttributes.model`                 |  173 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.ResponseAttributes.finishReasons`         |  178 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.WellKnownOperationName`                   |  193 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.WellKnownSystem`                          |  206 | `root-declaration` | **optional**    |
| `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.operation` |  415 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.request`   |  419 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.response`  |  423 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.token`     |  427 | `member`           | **optional**    |
| `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.usage`     |  431 | `member`           | **optional**    |

## Recommended

### `effect/unstable/ai/Telemetry.CurrentSpanTransformer`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:540`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for providing a `SpanTransformer` to large language model operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Telemetry } from "effect/unstable/ai"` and use `Telemetry.CurrentSpanTransformer`.
- **Suggested snippet:** Consume `Telemetry.CurrentSpanTransformer` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/Telemetry.GenAITelemetryAttributes`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:34`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The attributes used to describe telemetry in the context of Generative Artificial Intelligence (GenAI) models requests and responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.GenAITelemetryAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.AllAttributes`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:49`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** All telemetry attributes which are part of the GenAI specification.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.AllAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.BaseAttributes`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:64`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.BaseAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.BaseAttributes.system`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:69`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The Generative AI product as identified by the client or server instrumentation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.BaseAttributes.system` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.OperationAttributes`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:79`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.operation`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.OperationAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.TokenAttributes`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:90`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.token`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.TokenAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.UsageAttributes`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:101`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.usage`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.UsageAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:113`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.request`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.RequestAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.model`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:117`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The name of the GenAI model a request is being made to.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.model` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.temperature`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:121`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The temperature setting for the GenAI request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.temperature` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.topK`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:125`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The temperature setting for the GenAI request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.topK` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.topP`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:129`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The top_k sampling setting for the GenAI request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.topP` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.maxTokens`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:133`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The top_p sampling setting for the GenAI request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.maxTokens` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.encodingFormats`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:137`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The encoding formats requested in an embeddings operation, if specified.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.encodingFormats` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.stopSequences`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:142`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** List of sequences that the model will use to stop generating further tokens.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.stopSequences` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.frequencyPenalty`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:146`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The frequency penalty setting for the GenAI request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.frequencyPenalty` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.presencePenalty`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:150`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The presence penalty setting for the GenAI request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.presencePenalty` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.RequestAttributes.seed`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:155`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The seed setting for the GenAI request. Requests with same seed value are more likely to return same result.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.RequestAttributes.seed` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.ResponseAttributes`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:165`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.response`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.ResponseAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.ResponseAttributes.id`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:169`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The unique identifier for the completion.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.ResponseAttributes.id` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.ResponseAttributes.model`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:173`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The name of the model that generated the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.ResponseAttributes.model` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.ResponseAttributes.finishReasons`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:178`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Array of reasons the model stopped generating tokens, corresponding to each generation received.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.ResponseAttributes.finishReasons` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.WellKnownOperationName`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:193`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `gen_ai.operation.name` attribute has the following list of well-known values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.WellKnownOperationName`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.WellKnownSystem`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:206`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `gen_ai.system` attribute has the following list of well-known values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/Telemetry.WellKnownSystem`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.operation`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:415`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Operation-specific attributes (e.g., operation name).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.operation` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.request`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:419`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Request-specific attributes (e.g., model parameters).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.request` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.response`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:423`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Response-specific attributes (e.g., response metadata).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.response` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.token`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:427`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Token-specific attributes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.token` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.usage`

- **Source:** `packages/effect/src/unstable/ai/Telemetry.ts:431`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Usage statistics attributes (e.g., token counts).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Telemetry.GenAITelemetryAttributeOptions.usage` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

# Example Suggestions: `@effect/ai-anthropic/AnthropicTelemetry`

- **Package:** `@effect/ai-anthropic`
- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts`
- **Uncovered API records:** 11
- **Priorities:** 0 required, 0 recommended, 11 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                                   | Line | Kind               | Priority     |
| ------------------------------------------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/ai-anthropic/AnthropicTelemetry.AnthropicTelemetryAttributeOptions`          |   89 | `root-declaration` | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.addGenAIAnnotations`                         |  119 | `root-declaration` | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.AnthropicTelemetryAttributes`                |   28 | `root-declaration` | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.AllAttributes`                               |   41 | `root-declaration` | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.RequestAttributes`                           |   50 | `root-declaration` | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.RequestAttributes.extendedThinking`          |   54 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.RequestAttributes.thinkingBudgetTokens`      |   58 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes`                          |   68 | `root-declaration` | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes.stopReason`               |   72 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes.cacheCreationInputTokens` |   76 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes.cacheReadInputTokens`     |   80 | `member`           | **optional** |

## Optional

### `@effect/ai-anthropic/AnthropicTelemetry.AnthropicTelemetryAttributeOptions`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:89`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options accepted by `addGenAIAnnotations`, combining standard GenAI telemetry attributes with optional Anthropic request and response attributes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTelemetry.AnthropicTelemetryAttributeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.addGenAIAnnotations`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:119`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Applies the specified Anthropic GenAI telemetry attributes to the provided `Span`.
- **Signature hint:** `declare function addGenAIAnnotations(options: AnthropicTelemetryAttributeOptions): (span: Span) => void declare function addGenAIAnnotations(span: Span, options: AnthropicTelemetryAttributeOptions): void`
- **Import guidance:** Start from `import { AnthropicTelemetry } from "@effect/ai-anthropic"` and use `AnthropicTelemetry.addGenAIAnnotations`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Applies the specified Anthropic GenAI telemetry attributes to the provided `Span`. Call `AnthropicTelemetry.addGenAIAnnotations` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.AnthropicTelemetryAttributes`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:28`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The attributes used to describe telemetry in the context of Generative Artificial Intelligence (GenAI) Models requests and responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTelemetry.AnthropicTelemetryAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.AllAttributes`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:41`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** All telemetry attributes which are part of the GenAI specification, including the Anthropic-specific attributes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTelemetry.AllAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.RequestAttributes`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.anthropic.request`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTelemetry.RequestAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.RequestAttributes.extendedThinking`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:54`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether extended thinking is enabled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicTelemetry.RequestAttributes.extendedThinking` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.RequestAttributes.thinkingBudgetTokens`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:58`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The budget tokens for extended thinking.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicTelemetry.RequestAttributes.thinkingBudgetTokens` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:68`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Telemetry attributes which are part of the GenAI specification and are namespaced by `gen_ai.anthropic.response`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes.stopReason`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:72`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The stop reason from the response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes.stopReason` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes.cacheCreationInputTokens`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:76`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Number of cache creation input tokens.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes.cacheCreationInputTokens` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes.cacheReadInputTokens`

- **Source:** `packages/ai/anthropic/src/AnthropicTelemetry.ts:80`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Number of cache read input tokens.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicTelemetry.ResponseAttributes.cacheReadInputTokens` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

# Example Suggestions: `@effect/ai-openai-compat/OpenAiError`

- **Package:** `@effect/ai-openai-compat`
- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 0 recommended, 9 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                          | Line | Kind               | Priority     |
| ---------------------------------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata`                   |   24 | `root-declaration` | **optional** |
| `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata.errorCode`         |   28 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata.errorType`         |   32 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata.requestId`         |   36 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata`               |   50 | `root-declaration` | **optional** |
| `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.limit`         |   54 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.remaining`     |   58 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.resetRequests` |   62 | `member`           | **optional** |
| `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.resetTokens`   |   66 | `member`           | **optional** |

## Optional

### `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata`

- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts:24`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAI-specific error metadata fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata.errorCode`

- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts:28`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The OpenAI error code returned by the API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata.errorCode` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata.errorType`

- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts:32`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The OpenAI error type returned by the API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata.errorType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata.requestId`

- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts:36`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The unique request ID for debugging with OpenAI support.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiError.OpenAiErrorMetadata.requestId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata`

- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAI-specific rate limit metadata fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.limit`

- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts:54`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The rate limit type (e.g. "requests", "tokens").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.limit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.remaining`

- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts:58`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Number of remaining requests in the current window.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.remaining` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.resetRequests`

- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts:62`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Time until the request rate limit resets.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.resetRequests` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.resetTokens`

- **Source:** `packages/ai/openai-compat/src/OpenAiError.ts:66`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Time until the token rate limit resets.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openai-compat/OpenAiError.OpenAiRateLimitMetadata.resetTokens` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

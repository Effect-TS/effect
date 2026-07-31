# Example Suggestions: `@effect/ai-anthropic/AnthropicError`

- **Package:** `@effect/ai-anthropic`
- **Source:** `packages/ai/anthropic/src/AnthropicError.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 0 recommended, 10 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                                | Line | Kind               | Priority     |
| ---------------------------------------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/ai-anthropic/AnthropicError.AnthropicErrorMetadata`                       |   24 | `root-declaration` | **optional** |
| `@effect/ai-anthropic/AnthropicError.AnthropicErrorMetadata.errorType`             |   28 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicError.AnthropicErrorMetadata.requestId`             |   32 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata`                   |   45 | `root-declaration` | **optional** |
| `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.requestsLimit`     |   49 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.requestsRemaining` |   53 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.requestsReset`     |   57 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.tokensLimit`       |   61 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.tokensRemaining`   |   65 | `member`           | **optional** |
| `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.tokensReset`       |   69 | `member`           | **optional** |

## Optional

### `@effect/ai-anthropic/AnthropicError.AnthropicErrorMetadata`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:24`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Anthropic-specific error metadata fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicError.AnthropicErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicError.AnthropicErrorMetadata.errorType`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:28`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The Anthropic error type returned by the API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicError.AnthropicErrorMetadata.errorType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicError.AnthropicErrorMetadata.requestId`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:32`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The unique request ID for debugging with Anthropic support.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicError.AnthropicErrorMetadata.requestId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:45`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Anthropic-specific rate limit metadata fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.requestsLimit`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:49`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Number of requests allowed in the current period.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.requestsLimit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.requestsRemaining`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:53`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Number of requests remaining in the current period.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.requestsRemaining` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.requestsReset`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:57`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Time when the request rate limit resets.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.requestsReset` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.tokensLimit`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:61`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Number of tokens allowed in the current period.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.tokensLimit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.tokensRemaining`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:65`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Number of tokens remaining in the current period.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.tokensRemaining` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.tokensReset`

- **Source:** `packages/ai/anthropic/src/AnthropicError.ts:69`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Time when the token rate limit resets.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-anthropic/AnthropicError.AnthropicRateLimitMetadata.tokensReset` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

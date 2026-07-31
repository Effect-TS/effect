# Example Suggestions: `@effect/ai-openrouter/OpenRouterError`

- **Package:** `@effect/ai-openrouter`
- **Source:** `packages/ai/openrouter/src/OpenRouterError.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 0 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                       | Line | Kind               | Priority     |
| ------------------------------------------------------------------------- | ---: | ------------------ | ------------ |
| `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata`           |   16 | `root-declaration` | **optional** |
| `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata.errorCode` |   20 | `member`           | **optional** |
| `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata.errorType` |   24 | `member`           | **optional** |
| `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata.requestId` |   28 | `member`           | **optional** |
| `@effect/ai-openrouter/OpenRouterError.OpenRouterRateLimitMetadata`       |   37 | `root-declaration` | **optional** |

## Optional

### `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata`

- **Source:** `packages/ai/openrouter/src/OpenRouterError.ts:16`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenRouter-specific error metadata fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata.errorCode`

- **Source:** `packages/ai/openrouter/src/OpenRouterError.ts:20`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The error code returned by the API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata.errorCode` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata.errorType`

- **Source:** `packages/ai/openrouter/src/OpenRouterError.ts:24`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The error type returned by the API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata.errorType` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata.requestId`

- **Source:** `packages/ai/openrouter/src/OpenRouterError.ts:28`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The unique request ID for debugging.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-openrouter/OpenRouterError.OpenRouterErrorMetadata.requestId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-openrouter/OpenRouterError.OpenRouterRateLimitMetadata`

- **Source:** `packages/ai/openrouter/src/OpenRouterError.ts:37`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenRouter-specific rate limit metadata fields.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-openrouter/OpenRouterError.OpenRouterRateLimitMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

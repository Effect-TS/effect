# Example Suggestions: `effect/unstable/ai/AiError`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/AiError.ts`
- **Uncovered API records:** 54
- **Priorities:** 0 required, 3 recommended, 33 optional, 18 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                    | Line | Kind               | Priority        |
| ---------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/ai/AiError.UsageInfo`                                 |  313 | `root-declaration` | **recommended** |
| `effect/unstable/ai/AiError.HttpContext`                               |  338 | `root-declaration` | **recommended** |
| `effect/unstable/ai/AiError.AiErrorReason (value)`                     | 1355 | `root-declaration` | **recommended** |
| `effect/unstable/ai/AiError.RateLimitErrorMetadata`                    |  228 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.QuotaExhaustedErrorMetadata`               |  236 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.AuthenticationErrorMetadata`               |  244 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.ContentPolicyErrorMetadata`                |  252 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.InvalidRequestErrorMetadata`               |  260 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.InternalProviderErrorMetadata`             |  268 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.InvalidOutputErrorMetadata`                |  276 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.StructuredOutputErrorMetadata`             |  284 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.UnsupportedSchemaErrorMetadata`            |  292 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.UnknownErrorMetadata`                      |  300 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.AiErrorEncoded`                            | 1482 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.NetworkError.isRetryable`                  |   99 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.ProviderMetadata`                          |  220 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.RateLimitError.isRetryable`                |  392 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.QuotaExhaustedError.isRetryable`           |  443 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.AuthenticationError.isRetryable`           |  496 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.ContentPolicyError.isRetryable`            |  554 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.InvalidRequestError.isRetryable`           |  609 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.InternalProviderError.isRetryable`         |  664 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.InvalidOutputError.isRetryable`            |  715 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.StructuredOutputError.isRetryable`         |  793 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.UnsupportedSchemaError.isRetryable`        |  870 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.UnknownError.isRetryable`                  |  921 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.ToolNotFoundError.isRetryable`             |  977 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.ToolParameterValidationError.isRetryable`  | 1032 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.InvalidToolResultError.isRetryable`        | 1085 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.ToolResultEncodingError.isRetryable`       | 1139 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.ToolConfigurationError.isRetryable`        | 1191 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.ToolkitRequiredError.isRetryable`          | 1242 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.InvalidUserInputError.isRetryable`         | 1294 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.AiErrorReason (type)`                      | 1319 | `root-declaration` | **optional**    |
| `effect/unstable/ai/AiError.AiError.isRetryable`                       | 1458 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.AiError.retryAfter`                        | 1467 | `member`           | **optional**    |
| `effect/unstable/ai/AiError.NetworkError.ReasonTypeId`                 |   92 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.RateLimitError.ReasonTypeId`               |  385 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.QuotaExhaustedError.ReasonTypeId`          |  436 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.AuthenticationError.ReasonTypeId`          |  489 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.ContentPolicyError.ReasonTypeId`           |  547 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.InvalidRequestError.ReasonTypeId`          |  602 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.InternalProviderError.ReasonTypeId`        |  657 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.InvalidOutputError.ReasonTypeId`           |  708 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.StructuredOutputError.ReasonTypeId`        |  786 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.UnsupportedSchemaError.ReasonTypeId`       |  863 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.UnknownError.ReasonTypeId`                 |  914 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.ToolNotFoundError.ReasonTypeId`            |  970 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.ToolParameterValidationError.ReasonTypeId` | 1025 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.InvalidToolResultError.ReasonTypeId`       | 1078 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.ToolResultEncodingError.ReasonTypeId`      | 1132 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.ToolConfigurationError.ReasonTypeId`       | 1184 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.ToolkitRequiredError.ReasonTypeId`         | 1235 | `member`           | **discouraged** |
| `effect/unstable/ai/AiError.InvalidUserInputError.ReasonTypeId`        | 1287 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/ai/AiError.UsageInfo`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:313`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for token usage information from AI operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AiError } from "effect/unstable/ai"` and use `AiError.UsageInfo`.
- **Suggested snippet:** Use `AiError.UsageInfo` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/AiError.HttpContext`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:338`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for the combined HTTP context used in error reporting.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AiError } from "effect/unstable/ai"` and use `AiError.HttpContext`.
- **Suggested snippet:** Use `AiError.HttpContext` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/ai/AiError.AiErrorReason (value)`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1355`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for validating and parsing AI error reasons.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { AiError } from "effect/unstable/ai"` and use `AiError.AiErrorReason`.
- **Suggested snippet:** Use `AiError.AiErrorReason` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/ai/AiError.RateLimitErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:228`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `RateLimitError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.RateLimitErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.QuotaExhaustedErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:236`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `QuotaExhaustedError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.QuotaExhaustedErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.AuthenticationErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:244`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `AuthenticationError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.AuthenticationErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.ContentPolicyErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:252`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `ContentPolicyError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.ContentPolicyErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.InvalidRequestErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:260`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `InvalidRequestError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.InvalidRequestErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.InternalProviderErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:268`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `InternalProviderError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.InternalProviderErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.InvalidOutputErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:276`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `InvalidOutputError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.InvalidOutputErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.StructuredOutputErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:284`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `StructuredOutputError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.StructuredOutputErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.UnsupportedSchemaErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:292`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `UnsupportedSchemaError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.UnsupportedSchemaErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.UnknownErrorMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:300`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Provider-specific metadata attached to `UnknownError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.UnknownErrorMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.AiErrorEncoded`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1482`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** The encoded (serialized) form of an `AiError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.AiErrorEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.NetworkError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:99`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Transport errors are retryable; encoding and URL errors are not.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.NetworkError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.ProviderMetadata`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:220`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type of provider-specific metadata attached to AI error reasons.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.ProviderMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.RateLimitError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:392`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Rate limit errors are always retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.RateLimitError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.QuotaExhaustedError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:443`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Quota exhausted errors require user action and are not retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.QuotaExhaustedError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.AuthenticationError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:496`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Authentication errors require credential changes and are not retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.AuthenticationError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.ContentPolicyError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:554`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Content policy errors require content changes and are not retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.ContentPolicyError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.InvalidRequestError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:609`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalid request errors require fixing the request and are not retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.InvalidRequestError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.InternalProviderError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:664`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Internal provider errors are typically transient and are retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.InternalProviderError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.InvalidOutputError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:715`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalid output errors are retryable since LLM outputs are non-deterministic.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.InvalidOutputError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.StructuredOutputError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:793`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Structured output errors are retryable since LLM outputs are non-deterministic.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.StructuredOutputError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.UnsupportedSchemaError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:870`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unsupported schema errors are not retryable because they indicate a programmer error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.UnsupportedSchemaError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.UnknownError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:921`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unknown errors are not retryable by default.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.UnknownError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.ToolNotFoundError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:977`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Tool not found errors are retryable because the model may self-correct.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.ToolNotFoundError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.ToolParameterValidationError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1032`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Parameter validation errors are retryable because the model may correct parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.ToolParameterValidationError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.InvalidToolResultError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1085`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalid tool result errors are not retryable because they indicate a bug in the handler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.InvalidToolResultError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.ToolResultEncodingError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1139`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Encoding errors are not retryable because they indicate a code bug.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.ToolResultEncodingError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.ToolConfigurationError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1191`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Configuration errors are not retryable because they indicate a code bug.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.ToolConfigurationError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.ToolkitRequiredError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1242`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Toolkit required errors are not retryable without providing a toolkit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.ToolkitRequiredError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.InvalidUserInputError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1294`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Invalid user input errors require fixing the input and are not retryable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.InvalidUserInputError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.AiErrorReason (type)`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1319`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union type of all semantic error reasons that can occur during AI operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/ai/AiError.AiErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.AiError.isRetryable`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1458`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Delegates to the underlying reason's `isRetryable` getter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.AiError.isRetryable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/AiError.AiError.retryAfter`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1467`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Delegates to the underlying reason's `retryAfter` if present.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/AiError.AiError.retryAfter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/ai/AiError.NetworkError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:92`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `NetworkError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.NetworkError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.RateLimitError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:385`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `RateLimitError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.RateLimitError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.QuotaExhaustedError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:436`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `QuotaExhaustedError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.QuotaExhaustedError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.AuthenticationError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:489`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `AuthenticationError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.AuthenticationError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.ContentPolicyError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:547`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `ContentPolicyError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.ContentPolicyError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.InvalidRequestError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:602`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `InvalidRequestError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.InvalidRequestError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.InternalProviderError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:657`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `InternalProviderError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.InternalProviderError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.InvalidOutputError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:708`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `InvalidOutputError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.InvalidOutputError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.StructuredOutputError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:786`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `StructuredOutputError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.StructuredOutputError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.UnsupportedSchemaError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:863`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `UnsupportedSchemaError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.UnsupportedSchemaError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.UnknownError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:914`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `UnknownError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.UnknownError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.ToolNotFoundError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:970`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `ToolNotFoundError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.ToolNotFoundError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.ToolParameterValidationError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1025`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `ToolParameterValidationError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.ToolParameterValidationError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.InvalidToolResultError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1078`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `InvalidToolResultError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.InvalidToolResultError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.ToolResultEncodingError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1132`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `ToolResultEncodingError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.ToolResultEncodingError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.ToolConfigurationError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1184`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `ToolConfigurationError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.ToolConfigurationError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.ToolkitRequiredError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1235`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `ToolkitRequiredError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.ToolkitRequiredError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/ai/AiError.InvalidUserInputError.ReasonTypeId`

- **Source:** `packages/effect/src/unstable/ai/AiError.ts:1287`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks `InvalidUserInputError` as a semantic AI error reason for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/ai/AiError.InvalidUserInputError.ReasonTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

# Example Suggestions: `effect/unstable/http/HttpClientError`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts`
- **Uncovered API records:** 28
- **Priorities:** 0 required, 9 recommended, 18 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                              | Line | Kind               | Priority        |
| -------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpClientError.isHttpClientError`                         |   26 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientError.HttpClientError`                           |   34 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientError.TransportError`                            |   91 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientError.EncodeError`                               |  121 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientError.InvalidUrlError`                           |  151 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientError.StatusCodeError`                           |  181 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientError.DecodeError`                               |  213 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientError.EmptyBodyError`                            |  245 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientError.HttpClientErrorSchema`                     |  302 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientError.HttpClientErrorReason`                     |  293 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpClientError.RequestError`                              |  277 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpClientError.ResponseError`                             |  285 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpClientError.HttpClientError.request`                   |   62 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.HttpClientError.response`                  |   71 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.TransportError.methodAndUrl`               |  101 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.TransportError.message`                    |  110 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.EncodeError.methodAndUrl`                  |  131 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.EncodeError.message`                       |  140 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.InvalidUrlError.methodAndUrl`              |  161 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.InvalidUrlError.message`                   |  170 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.StatusCodeError.methodAndUrl`              |  192 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.StatusCodeError.message`                   |  201 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.DecodeError.methodAndUrl`                  |  224 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.DecodeError.message`                       |  233 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.EmptyBodyError.methodAndUrl`               |  256 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.EmptyBodyError.message`                    |  265 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.HttpClientErrorSchema.fromHttpClientError` |  321 | `member`           | **optional**    |
| `effect/unstable/http/HttpClientError.HttpClientError.TypeId`                    |   55 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/http/HttpClientError.isHttpClientError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:26`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an `HttpClientError`.
- **Signature hint:** `declare function isHttpClientError(u: unknown): u is HttpClientError`
- **Import guidance:** Start from `import { HttpClientError } from "effect/unstable/http"` and use `HttpClientError.isHttpClientError`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpClientError.isHttpClientError` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientError.HttpClientError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:34`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error wrapper for HTTP client failures, exposing the failed request and the optional response through its `reason`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientError } from "effect/unstable/http"` and use `HttpClientError.HttpClientError`.
- **Suggested snippet:** Create or capture `HttpClientError.HttpClientError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientError.TransportError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:91`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error describing transport-level failures that occur while sending an HTTP request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientError } from "effect/unstable/http"` and use `HttpClientError.TransportError`.
- **Suggested snippet:** Create or capture `HttpClientError.TransportError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientError.EncodeError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:121`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error describing failures while encoding an HTTP request body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientError } from "effect/unstable/http"` and use `HttpClientError.EncodeError`.
- **Suggested snippet:** Create or capture `HttpClientError.EncodeError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientError.InvalidUrlError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:151`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error describing failures while constructing a URL from an HTTP client request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientError } from "effect/unstable/http"` and use `HttpClientError.InvalidUrlError`.
- **Suggested snippet:** Create or capture `HttpClientError.InvalidUrlError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientError.StatusCodeError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:181`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Response error for HTTP responses rejected because of their status code.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientError } from "effect/unstable/http"` and use `HttpClientError.StatusCodeError`.
- **Suggested snippet:** Create or capture `HttpClientError.StatusCodeError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientError.DecodeError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:213`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Response error for failures while decoding an HTTP response body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientError } from "effect/unstable/http"` and use `HttpClientError.DecodeError`.
- **Suggested snippet:** Create or capture `HttpClientError.DecodeError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientError.EmptyBodyError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:245`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Response error for operations that expected a response body but received an empty body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientError } from "effect/unstable/http"` and use `HttpClientError.EmptyBodyError`.
- **Suggested snippet:** Create or capture `HttpClientError.EmptyBodyError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientError.HttpClientErrorSchema`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:302`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for serializable HTTP client errors, preserving the specific error kind and cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientError } from "effect/unstable/http"` and use `HttpClientError.HttpClientErrorSchema`.
- **Suggested snippet:** Use `HttpClientError.HttpClientErrorSchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpClientError.HttpClientErrorReason`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:293`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of all specific failure reasons carried by `HttpClientError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClientError.HttpClientErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.RequestError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:277`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of HTTP client errors that occur before a response is available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClientError.RequestError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.ResponseError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:285`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of HTTP client errors that include an HTTP response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClientError.ResponseError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.HttpClientError.request`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:62`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** HTTP request associated with the client failure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.HttpClientError.request` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.HttpClientError.response`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:71`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** HTTP response associated with the client failure, when one was received.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.HttpClientError.response` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.TransportError.methodAndUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:101`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the request method and URL for transport error messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.TransportError.methodAndUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.TransportError.message`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:110`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds the transport error message from the optional description and request details.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.TransportError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.EncodeError.methodAndUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:131`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the request method and URL for request encoding error messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.EncodeError.methodAndUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.EncodeError.message`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:140`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds the request encoding error message from the optional description and request details.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.EncodeError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.InvalidUrlError.methodAndUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:161`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the request method and URL for invalid URL error messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.InvalidUrlError.methodAndUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.InvalidUrlError.message`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:170`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds the invalid URL error message from the optional description and request details.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.InvalidUrlError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.StatusCodeError.methodAndUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:192`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the request method and URL for status code error messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.StatusCodeError.methodAndUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.StatusCodeError.message`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:201`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds the status code error message from the response status, optional description, and request details.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.StatusCodeError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.DecodeError.methodAndUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:224`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the request method and URL for response decoding error messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.DecodeError.methodAndUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.DecodeError.message`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:233`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds the response decoding error message from the response status, optional description, and request details.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.DecodeError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.EmptyBodyError.methodAndUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:256`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the request method and URL for empty response body error messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.EmptyBodyError.methodAndUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.EmptyBodyError.message`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:265`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds the empty body error message from the response status, optional description, and request details.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.EmptyBodyError.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientError.HttpClientErrorSchema.fromHttpClientError`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:321`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds the serializable schema representation for an HTTP client error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClientError.HttpClientErrorSchema.fromHttpClientError` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/HttpClientError.HttpClientError.TypeId`

- **Source:** `packages/effect/src/unstable/http/HttpClientError.ts:55`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an HTTP client error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/http/HttpClientError.HttpClientError.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

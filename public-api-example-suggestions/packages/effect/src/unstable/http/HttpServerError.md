# Example Suggestions: `effect/unstable/http/HttpServerError`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts`
- **Uncovered API records:** 15
- **Priorities:** 0 required, 10 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                         | Line | Kind               | Priority        |
| --------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpServerError.HttpServerError`                      |   40 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.RequestParseError`                    |   91 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.RouteNotFound`                        |  125 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.InternalError`                        |  155 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.isHttpServerError`                    |  184 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.ResponseError`                        |  197 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.ServeError`                           |  239 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.causeResponse`                        |  283 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.causeResponseStripped`                |  340 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.exitResponse`                         |  369 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerError.HttpServerErrorReason`                |  231 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerError.ClientAbort`                          |  255 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerError.RequestError`                         |  223 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerError.RequestParseError.Respondable.symbol` |  101 | `member`           | **optional**    |
| `effect/unstable/http/HttpServerError.InternalError.Respondable.symbol`     |  165 | `member`           | **optional**    |

## Recommended

### `effect/unstable/http/HttpServerError.HttpServerError`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:40`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Tagged error for failures that occur while handling an HTTP server request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.HttpServerError`.
- **Suggested snippet:** Create or capture `HttpServerError.HttpServerError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerError.RequestParseError`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:91`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error describing a failure to parse or read an incoming request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.RequestParseError`.
- **Suggested snippet:** Create or capture `HttpServerError.RequestParseError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerError.RouteNotFound`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:125`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error indicating that no route matched the incoming request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.RouteNotFound`.
- **Suggested snippet:** Create or capture `HttpServerError.RouteNotFound` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerError.InternalError`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:155`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error describing an unexpected server-side failure while handling a request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.InternalError`.
- **Suggested snippet:** Create or capture `HttpServerError.InternalError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerError.isHttpServerError`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:184`
- **Kind / category:** `root-declaration` / `predicates`
- **Priority:** **recommended**
- **Current description:** Returns `true` when the supplied value is an `HttpServerError`.
- **Signature hint:** `declare function isHttpServerError(u: unknown): u is HttpServerError`
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.isHttpServerError`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpServerError.isHttpServerError` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerError.ResponseError`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:197`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error describing a failure related to an HTTP response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.ResponseError`.
- **Suggested snippet:** Create or capture `HttpServerError.ResponseError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerError.ServeError`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:239`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error wrapping a low-level failure from the HTTP server implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.ServeError`.
- **Suggested snippet:** Create or capture `HttpServerError.ServeError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerError.causeResponse`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:283`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Converts a failed handler cause into the HTTP response that should be sent and the cause that should be reported.
- **Signature hint:** `declare function causeResponse<E>(cause: Cause.Cause<E>): Effect.Effect<readonly [Response.HttpServerResponse, Cause.Cause<E>]>`
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.causeResponse`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerError.causeResponse`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerError.causeResponseStripped`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:340`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Derives an HTTP response from a failed handler cause synchronously.
- **Signature hint:** `declare function causeResponseStripped<E>(cause: Cause.Cause<E>): readonly [response: Response.HttpServerResponse, cause: Option.Option<Cause.Cause<E>>]`
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.causeResponseStripped`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Derives an HTTP response from a failed handler cause synchronously. Call `HttpServerError.causeResponseStripped` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerError.exitResponse`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:369`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Extracts the response from a successful handler exit, or derives a response from the failure cause.
- **Signature hint:** `declare function exitResponse<E>(exit: Exit.Exit<Response.HttpServerResponse, E>): Response.HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.exitResponse`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts the response from a successful handler exit, or derives a response from the failure cause. Call `HttpServerError.exitResponse` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpServerError.HttpServerErrorReason`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:231`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Reason carried by an `HttpServerError`, either a request-level error or a response-level error.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServerError.HttpServerErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerError.ClientAbort`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:255`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Context annotation used to mark an interrupt as caused by the client aborting the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerError } from "effect/unstable/http"` and use `HttpServerError.ClientAbort`.
- **Suggested snippet:** Consume `HttpServerError.ClientAbort` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerError.RequestError`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:223`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of errors that are tied directly to an incoming server request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServerError.RequestError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerError.RequestParseError.Respondable.symbol`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:101`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Converts the request error into a `400 Bad Request` response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpServerError.RequestParseError.Respondable.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerError.InternalError.Respondable.symbol`

- **Source:** `packages/effect/src/unstable/http/HttpServerError.ts:165`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Converts the server error into a `500 Internal Server Error` response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpServerError.InternalError.Respondable.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

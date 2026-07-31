# Example Suggestions: `effect/unstable/http/HttpClientRequest`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts`
- **Uncovered API records:** 51
- **Priorities:** 0 required, 25 recommended, 25 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                          | Line | Kind                    | Priority        |
| ------------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/unstable/http/HttpClientRequest.isHttpClientRequest` |   42 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.makeWith`            |  117 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.modify`              |  243 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.setMethod`           |  283 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.setHeader`           |  298 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.setHeaders`          |  317 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.updateHeaders`       |  336 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.removeHeader`        |  355 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.basicAuth`           |  369 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.bearerToken`         |  395 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.accept`              |  410 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.acceptJson`          |  421 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.prependUrl`          |  464 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.appendUrl`           |  485 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.updateUrl`           |  518 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.appendUrlParam`      |  575 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.appendUrlParams`     |  594 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.removeHash`          |  632 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.bodyUint8Array`      |  679 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.bodyText`            |  694 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.bodyJson`            |  709 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.schemaBodyJson`      |  744 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.bodyUrlParams`       |  775 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.bodyFormData`        |  790 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.bodyFormDataRecord`  |  801 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClientRequest.Options (type)`      |   66 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.empty`               |  141 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.make`                |  156 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.get`                 |  175 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.post`                |  183 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.patch`               |  191 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.put`                 |  199 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.delete`              |  210 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.head`                |  219 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.options`             |  227 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.trace`               |  235 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.setUrl`              |  429 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.setUrlParam`         |  537 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.setUrlParams`        |  556 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.setHash`             |  613 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.setBody`             |  648 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.bodyStream`          |  816 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.bodyFile`            |  845 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.toUrl`               |  889 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.fromWeb`             |  903 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.toWebResult`         |  937 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.toWeb`               |  994 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.HttpClientRequest`   |   50 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClientRequest.Options (type)`      |   82 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpClientRequest.Options.NoUrl`       |   89 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpClientRequest.bodyJsonUnsafe`      |  733 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/unstable/http/HttpClientRequest.isHttpClientRequest`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:42`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an `HttpClientRequest`.
- **Signature hint:** `declare function isHttpClientRequest(u: unknown): u is HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.isHttpClientRequest`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpClientRequest.isHttpClientRequest` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.makeWith`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:117`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs an `HttpClientRequest` from fully normalized request components.
- **Signature hint:** `declare function makeWith(method: HttpMethod, url: string, urlParams: UrlParams.Input, hash: Option.Option<string>, headers: Headers.Headers, body: HttpBody.HttpBody): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.makeWith`.
- **Suggested snippet:** Construct one representative value with `HttpClientRequest.makeWith`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.modify`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:243`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Applies request options to an `HttpClientRequest`, returning a new request.
- **Signature hint:** `declare function modify(options: Options): (self: HttpClientRequest) => HttpClientRequest declare function modify(self: HttpClientRequest, options: Options): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.modify`.
- **Suggested snippet:** Create the smallest mutable reference supported by the module, apply `HttpClientRequest.modify` with an update that returns a visibly different result and state, then read the state and assert both observable values. For Effect-returning variants, include failure preservation only when tests establish it.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.setMethod`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:283`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets the HTTP method on a request, returning a new request.
- **Signature hint:** `declare function setMethod(method: HttpMethod): (self: HttpClientRequest) => HttpClientRequest declare function setMethod(self: HttpClientRequest, method: HttpMethod): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.setMethod`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the HTTP method on a request, returning a new request. Call `HttpClientRequest.setMethod` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.setHeader`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:298`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets a single request header, replacing any existing value for that header.
- **Signature hint:** `declare function setHeader(key: string, value: string): (self: HttpClientRequest) => HttpClientRequest declare function setHeader(self: HttpClientRequest, key: string, value: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.setHeader`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets a single request header, replacing any existing value for that header. Call `HttpClientRequest.setHeader` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.setHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:317`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets multiple request headers from an input collection, replacing existing values with matching names.
- **Signature hint:** `declare function setHeaders(input: Headers.Input): (self: HttpClientRequest) => HttpClientRequest declare function setHeaders(self: HttpClientRequest, input: Headers.Input): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.setHeaders`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets multiple request headers from an input collection, replacing existing values with matching names. Call `HttpClientRequest.setHeaders` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.updateHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:336`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Transforms the request headers with the provided function, returning a new request.
- **Signature hint:** `declare function updateHeaders(f: (headers: Headers.Headers) => Headers.Headers): (self: HttpClientRequest) => HttpClientRequest declare function updateHeaders(self: HttpClientRequest, f: (headers: Headers.Headers) => Headers.Headers): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.updateHeaders`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Transforms the request headers with the provided function, returning a new request. Call `HttpClientRequest.updateHeaders` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.removeHeader`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:355`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Removes a single request header by name, returning a new request.
- **Signature hint:** `declare function removeHeader(key: string): (self: HttpClientRequest) => HttpClientRequest declare function removeHeader(self: HttpClientRequest, key: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.removeHeader`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Removes a single request header by name, returning a new request. Call `HttpClientRequest.removeHeader` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.basicAuth`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:369`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets the `Authorization` header using HTTP Basic authentication credentials.
- **Signature hint:** `declare function basicAuth(username: string | Redacted.Redacted, password: string | Redacted.Redacted): (self: HttpClientRequest) => HttpClientRequest declare function basicAuth(self: HttpClientRequest, username: string | Redacted.Redacted, password: string | Redacted.Redacted): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.basicAuth`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the `Authorization` header using HTTP Basic authentication credentials. Call `HttpClientRequest.basicAuth` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.bearerToken`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:395`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets the `Authorization` header using a bearer token.
- **Signature hint:** `declare function bearerToken(token: string | Redacted.Redacted): (self: HttpClientRequest) => HttpClientRequest declare function bearerToken(self: HttpClientRequest, token: string | Redacted.Redacted): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bearerToken`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the `Authorization` header using a bearer token. Call `HttpClientRequest.bearerToken` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.accept`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:410`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets the `Accept` header to the specified media type.
- **Signature hint:** `declare function accept(mediaType: string): (self: HttpClientRequest) => HttpClientRequest declare function accept(self: HttpClientRequest, mediaType: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.accept`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the `Accept` header to the specified media type. Call `HttpClientRequest.accept` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.acceptJson`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:421`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets the `Accept` header to `application/json`.
- **Signature hint:** `declare function acceptJson(self: HttpClientRequest): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.acceptJson`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the `Accept` header to `application/json`. Call `HttpClientRequest.acceptJson` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.prependUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:464`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Prepends a URL segment to the request URL, inserting or trimming one slash as needed.
- **Signature hint:** `declare function prependUrl(path: string): (self: HttpClientRequest) => HttpClientRequest declare function prependUrl(self: HttpClientRequest, path: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.prependUrl`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Prepends a URL segment to the request URL, inserting or trimming one slash as needed. Call `HttpClientRequest.prependUrl` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.appendUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:485`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Appends a URL segment to the request URL, inserting or trimming one slash as needed.
- **Signature hint:** `declare function appendUrl(path: string): (self: HttpClientRequest) => HttpClientRequest declare function appendUrl(self: HttpClientRequest, path: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.appendUrl`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Appends a URL segment to the request URL, inserting or trimming one slash as needed. Call `HttpClientRequest.appendUrl` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.updateUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:518`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Updates the request URL by applying a function to the current URL string.
- **Signature hint:** `declare function updateUrl(f: (url: string) => string): (self: HttpClientRequest) => HttpClientRequest declare function updateUrl(self: HttpClientRequest, f: (url: string) => string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.updateUrl`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the request URL by applying a function to the current URL string. Call `HttpClientRequest.updateUrl` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.appendUrlParam`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:575`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Appends one query parameter value without removing existing values for the same name.
- **Signature hint:** `declare function appendUrlParam(key: string, value: string): (self: HttpClientRequest) => HttpClientRequest declare function appendUrlParam(self: HttpClientRequest, key: string, value: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.appendUrlParam`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Appends one query parameter value without removing existing values for the same name. Call `HttpClientRequest.appendUrlParam` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.appendUrlParams`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:594`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Appends query parameters from an input collection without removing existing values for matching names.
- **Signature hint:** `declare function appendUrlParams(input: UrlParams.Input): (self: HttpClientRequest) => HttpClientRequest declare function appendUrlParams(self: HttpClientRequest, input: UrlParams.Input): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.appendUrlParams`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Appends query parameters from an input collection without removing existing values for matching names. Call `HttpClientRequest.appendUrlParams` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.removeHash`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:632`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Removes the URL fragment from a request.
- **Signature hint:** `declare function removeHash(self: HttpClientRequest): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.removeHash`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Removes the URL fragment from a request. Call `HttpClientRequest.removeHash` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.bodyUint8Array`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:679`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets a `Uint8Array` request body with an optional content type.
- **Signature hint:** `declare function bodyUint8Array(body: Uint8Array, contentType?: string): (self: HttpClientRequest) => HttpClientRequest declare function bodyUint8Array(self: HttpClientRequest, body: Uint8Array, contentType?: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bodyUint8Array`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets a `Uint8Array` request body with an optional content type. Call `HttpClientRequest.bodyUint8Array` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.bodyText`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:694`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets a text request body with an optional content type.
- **Signature hint:** `declare function bodyText(body: string, contentType?: string): (self: HttpClientRequest) => HttpClientRequest declare function bodyText(self: HttpClientRequest, body: string, contentType?: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bodyText`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets a text request body with an optional content type. Call `HttpClientRequest.bodyText` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.bodyJson`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:709`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Encodes a value as a JSON request body and sets it on the request, failing with `HttpBodyError` if encoding fails.
- **Signature hint:** `declare function bodyJson(body: unknown): (self: HttpClientRequest) => Effect.Effect<HttpClientRequest, HttpBody.HttpBodyError> declare function bodyJson(self: HttpClientRequest, body: unknown): Effect.Effect<HttpClientRequest, HttpBody.HttpBodyError>`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bodyJson`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientRequest.bodyJson`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.schemaBodyJson`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:744`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Creates a schema-based JSON body encoder that sets the encoded value on a request.
- **Signature hint:** `declare function schemaBodyJson<S extends Schema.Constraint>(schema: S, options?: ParseOptions | undefined): { (body: S['Type']): (self: HttpClientRequest) => Effect.Effect<HttpClientRequest, HttpBody.HttpBodyError, S['EncodingServices']>; (self: HttpClientRequest, body: S['Type']): Effect.Effect<HttpClientRequest, HttpBody.HttpBodyError, S['EncodingServices']>; }`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.schemaBodyJson`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a schema-based JSON body encoder that sets the encoded value on a request. Call `HttpClientRequest.schemaBodyJson` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.bodyUrlParams`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:775`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets an `application/x-www-form-urlencoded` request body from URL parameter input.
- **Signature hint:** `declare function bodyUrlParams(input: UrlParams.Input): (self: HttpClientRequest) => HttpClientRequest declare function bodyUrlParams(self: HttpClientRequest, input: UrlParams.Input): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bodyUrlParams`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets an `application/x-www-form-urlencoded` request body from URL parameter input. Call `HttpClientRequest.bodyUrlParams` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.bodyFormData`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:790`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets a `FormData` request body.
- **Signature hint:** `declare function bodyFormData(body: FormData): (self: HttpClientRequest) => HttpClientRequest declare function bodyFormData(self: HttpClientRequest, body: FormData): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bodyFormData`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets a `FormData` request body. Call `HttpClientRequest.bodyFormData` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientRequest.bodyFormDataRecord`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:801`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Creates a `FormData` request body from record-style entries and sets it on the request.
- **Signature hint:** `declare function bodyFormDataRecord(entries: HttpBody.FormDataInput): (self: HttpClientRequest) => HttpClientRequest declare function bodyFormDataRecord(self: HttpClientRequest, entries: HttpBody.FormDataInput): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bodyFormDataRecord`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `FormData` request body from record-style entries and sets it on the request. Call `HttpClientRequest.bodyFormDataRecord` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpClientRequest.Options (type)`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:66`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for constructing or modifying an `HttpClientRequest`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClientRequest.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.empty`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:141`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** An empty `GET` request with no URL, query parameters, hash, headers, or body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.empty`.
- **Suggested snippet:** Construct one representative value with `HttpClientRequest.empty`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.make`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:156`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a request constructor for the specified HTTP method.
- **Signature hint:** `declare function make<M extends HttpMethod>(method: M): (url: string | URL, options?: Options.NoUrl | undefined) => HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.make`.
- **Suggested snippet:** Construct one representative value with `HttpClientRequest.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.get`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:175`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `GET` request for the specified URL.
- **Signature hint:** `declare function get(url: string | URL, options?: Options.NoUrl): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.get`.
- **Suggested snippet:** Create a small representative input, call `HttpClientRequest.get`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.post`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:183`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `POST` request for the specified URL.
- **Signature hint:** `declare function post(url: string | URL, options?: Options.NoUrl): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.post`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `POST` request for the specified URL. Call `HttpClientRequest.post` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.patch`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:191`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `PATCH` request for the specified URL.
- **Signature hint:** `declare function patch(url: string | URL, options?: Options.NoUrl): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.patch`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `PATCH` request for the specified URL. Call `HttpClientRequest.patch` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.put`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:199`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `PUT` request for the specified URL.
- **Signature hint:** `declare function put(url: string | URL, options?: Options.NoUrl): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.put`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `PUT` request for the specified URL. Call `HttpClientRequest.put` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.delete`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:210`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `DELETE` request for the specified URL.
- **Signature hint:** `declare const _delete: { (url: string | URL, options?: Options.NoUrl): HttpClientRequest; } export { _delete as delete }`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.delete`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `DELETE` request for the specified URL. Call `HttpClientRequest.delete` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.head`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:219`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `HEAD` request for the specified URL.
- **Signature hint:** `declare function head(url: string | URL, options?: Options.NoUrl): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.head`.
- **Suggested snippet:** Create a small representative input, call `HttpClientRequest.head`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.options`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:227`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an `OPTIONS` request for the specified URL.
- **Signature hint:** `declare function options(url: string | URL, options?: Options.NoUrl): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.options`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an `OPTIONS` request for the specified URL. Call `HttpClientRequest.options` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.trace`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:235`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `TRACE` request for the specified URL.
- **Signature hint:** `declare function trace(url: string | URL, options?: Options.NoUrl): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.trace`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `TRACE` request for the specified URL. Call `HttpClientRequest.trace` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.setUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:429`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Sets the request URL. When given a `URL`, its search parameters and hash are extracted into the request's structured fields.
- **Signature hint:** `declare function setUrl(url: string | URL): (self: HttpClientRequest) => HttpClientRequest declare function setUrl(self: HttpClientRequest, url: string | URL): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.setUrl`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the request URL. When given a `URL`, its search parameters and hash are extracted into the request's structured fields. Call `HttpClientRequest.setUrl` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.setUrlParam`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:537`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Sets one query parameter, replacing existing values for that parameter name.
- **Signature hint:** `declare function setUrlParam(key: string, value: string): (self: HttpClientRequest) => HttpClientRequest declare function setUrlParam(self: HttpClientRequest, key: string, value: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.setUrlParam`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets one query parameter, replacing existing values for that parameter name. Call `HttpClientRequest.setUrlParam` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.setUrlParams`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:556`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Sets query parameters from an input collection, replacing existing values for matching names.
- **Signature hint:** `declare function setUrlParams(input: UrlParams.Input): (self: HttpClientRequest) => HttpClientRequest declare function setUrlParams(self: HttpClientRequest, input: UrlParams.Input): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.setUrlParams`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets query parameters from an input collection, replacing existing values for matching names. Call `HttpClientRequest.setUrlParams` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.setHash`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:613`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Sets the URL fragment on a request without the leading `#`.
- **Signature hint:** `declare function setHash(hash: string): (self: HttpClientRequest) => HttpClientRequest declare function setHash(self: HttpClientRequest, hash: string): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.setHash`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the URL fragment on a request without the leading `#`. Call `HttpClientRequest.setHash` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.setBody`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:648`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Sets the request body and updates `Content-Type` and `Content-Length` headers from the body metadata when available.
- **Signature hint:** `declare function setBody(body: HttpBody.HttpBody): (self: HttpClientRequest) => HttpClientRequest declare function setBody(self: HttpClientRequest, body: HttpBody.HttpBody): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.setBody`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the request body and updates `Content-Type` and `Content-Length` headers from the body metadata when available. Call `HttpClientRequest.setBody` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.bodyStream`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:816`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Sets a streaming `Uint8Array` request body with optional content type and content length metadata.
- **Signature hint:** `declare function bodyStream(body: Stream.Stream<Uint8Array, unknown>, options?: { readonly contentType?: string | undefined; readonly contentLength?: number | undefined; } | undefined): (self: HttpClientRequest) => HttpClientRequest declare function bodyStream(self: HttpClientRequest, body: Stream.Stream<Uint8Array, unknown>, options?: { readonly contentType?: string | undefined; readonly contentLength?: number | undefined; } | undefined): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bodyStream`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets a streaming `Uint8Array` request body with optional content type and content length metadata. Call `HttpClientRequest.bodyStream` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.bodyFile`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:845`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Creates a file-backed request body from a filesystem path and sets it on the request.
- **Signature hint:** `declare function bodyFile(path: string, options?: { readonly bytesToRead?: FileSystem.SizeInput | undefined; readonly chunkSize?: FileSystem.SizeInput | undefined; readonly offset?: FileSystem.SizeInput | undefined; readonly contentType?: string; }): (self: HttpClientRequest) => Effect.Effect<HttpClientRequest, PlatformError.PlatformError, FileSystem.FileSystem> declare function bodyFile(self: HttpClientRequest, path: string, options?: { readonly bytesToRead?: FileSystem.SizeInput | undefined; readonly chunkSize?: FileSystem.SizeInput | undefined; readonly offset?: FileSystem.SizeInput | undefined; readonly contentType?: string; }): Effect.Effect<HttpClientRequest, PlatformError.PlatformError, FileSystem.FileSystem>`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bodyFile`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientRequest.bodyFile`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.toUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:889`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Builds a `URL` from the request URL, query parameters, and hash, returning `Option.none()` if the URL is invalid.
- **Signature hint:** `declare function toUrl(self: HttpClientRequest): Option.Option<URL>`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.toUrl`.
- **Suggested snippet:** Call `HttpClientRequest.toUrl` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.fromWeb`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:903`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts a Web `Request` into an `HttpClientRequest`, preserving method, URL, headers, and supported request bodies.
- **Signature hint:** `declare function fromWeb(request: globalThis.Request): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.fromWeb`.
- **Suggested snippet:** Convert one representative external input with `HttpClientRequest.fromWeb` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.toWebResult`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:937`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an `HttpClientRequest` safely to a Web `Request` as a `Result`, failing when the request URL is invalid.
- **Signature hint:** `declare function toWebResult(self: HttpClientRequest, options?: { readonly signal?: AbortSignal | undefined; readonly context?: Context.Context<never> | undefined; }): Result.Result<Request, Url.UrlError>`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.toWebResult`.
- **Suggested snippet:** Call `HttpClientRequest.toWebResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.toWeb`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:994`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an `HttpClientRequest` to a Web `Request`, failing with `UrlError` when the request URL is invalid.
- **Signature hint:** `declare function toWeb(self: HttpClientRequest, options?: { readonly signal?: AbortSignal | undefined; }): Effect.Effect<Request, Url.UrlError>`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.toWeb`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientRequest.toWeb`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.HttpClientRequest`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Immutable model of an outgoing HTTP client request, including its method, URL components, headers, and body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClientRequest.HttpClientRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.Options (type)`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:82`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing option types associated with `HttpClientRequest` construction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClientRequest.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientRequest.Options.NoUrl`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:89`
- **Kind / category:** `namespace-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Request options that omit the method and URL for helpers that already receive those values separately.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClientRequest.Options.NoUrl`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/HttpClientRequest.bodyJsonUnsafe`

- **Source:** `packages/effect/src/unstable/http/HttpClientRequest.ts:733`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **discouraged**
- **Current description:** Sets a JSON request body using unsafe JSON encoding.
- **Signature hint:** `declare function bodyJsonUnsafe(body: unknown): (self: HttpClientRequest) => HttpClientRequest declare function bodyJsonUnsafe(self: HttpClientRequest, body: unknown): HttpClientRequest`
- **Import guidance:** Start from `import { HttpClientRequest } from "effect/unstable/http"` and use `HttpClientRequest.bodyJsonUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpClientRequest.bodyJsonUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

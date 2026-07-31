# Example Suggestions: `effect/unstable/http/HttpServerResponse`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts`
- **Uncovered API records:** 39
- **Priorities:** 0 required, 16 recommended, 19 optional, 4 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                               | Line | Kind                    | Priority        |
| ----------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/http/HttpServerResponse.isHttpServerResponse`    |  109 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.html`                    |  224 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.htmlStream`              |  256 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.json`                    |  289 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.schemaJson`              |  316 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.stream`                  |  447 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.file`                    |  483 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.fileWeb`                 |  506 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.setHeader`               |  524 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.setHeaders`              |  545 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.removeCookie`            |  563 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.replaceCookies`          |  581 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.setCookie`               |  600 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.expireCookie`            |  643 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.updateCookies`           |  757 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.mergeCookies`            |  789 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpServerResponse.Options (type)`          |   68 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.empty`                   |  121 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.redirect`                |  142 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.uint8Array`              |  163 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.text`                    |  196 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.urlParams`               |  374 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.raw`                     |  403 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.formData`                |  424 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.setCookies`              |  809 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.setBody`                 |  911 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.setStatus`               |  929 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.toWeb`                   |  965 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.toClientResponse`        | 1043 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.fromClientResponse`      | 1264 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.fromWeb`                 | 1357 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.HttpServerResponse`      |   53 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpServerResponse.Options (type)`          |   83 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpServerResponse.Options.WithContent`     |   91 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpServerResponse.Options.WithContentType` |  100 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpServerResponse.jsonUnsafe`              |  353 | `root-declaration`      | **discouraged** |
| `effect/unstable/http/HttpServerResponse.setCookieUnsafe`         |  684 | `root-declaration`      | **discouraged** |
| `effect/unstable/http/HttpServerResponse.expireCookieUnsafe`      |  722 | `root-declaration`      | **discouraged** |
| `effect/unstable/http/HttpServerResponse.setCookiesUnsafe`        |  862 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/unstable/http/HttpServerResponse.isHttpServerResponse`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:109`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when the supplied value is an `HttpServerResponse`.
- **Signature hint:** `declare function isHttpServerResponse(u: unknown): u is HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.isHttpServerResponse`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpServerResponse.isHttpServerResponse` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.html`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:224`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an HTML response with the `text/html` content type.
- **Signature hint:** `declare function html<A extends ReadonlyArray<Template.Interpolated>>(strings: TemplateStringsArray, ...args: A): Effect.Effect<HttpServerResponse, Template.Interpolated.Error<A[number]>, Template.Interpolated.Context<A[number]>> declare function html(html: string): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.html`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerResponse.html`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.htmlStream`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:256`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a streaming HTML response from a template.
- **Signature hint:** `declare function htmlStream<A extends ReadonlyArray<Template.InterpolatedWithStream>>(strings: TemplateStringsArray, ...args: A): Effect.Effect<HttpServerResponse, never, Template.Interpolated.Context<A[number]>>`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.htmlStream`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerResponse.htmlStream`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.json`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:289`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a JSON HTTP response.
- **Signature hint:** `declare function json(body: unknown, options?: Options.WithContentType | undefined): Effect.Effect<HttpServerResponse, Body.HttpBodyError>`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.json`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerResponse.json`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.schemaJson`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:316`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a JSON response constructor backed by a schema encoder.
- **Signature hint:** `declare function schemaJson<A, RE>(schema: Schema.ConstraintCodec<A, unknown, unknown, RE>, options?: ParseOptions | undefined): (body: A, options?: Options.WithContentType | undefined) => Effect.Effect<HttpServerResponse, Body.HttpBodyError, RE>`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.schemaJson`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerResponse.schemaJson`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.stream`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:447`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a streaming response from a stream of byte chunks.
- **Signature hint:** `declare function stream<E>(body: Stream.Stream<Uint8Array, E>, options?: Options | undefined): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.stream`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a streaming response from a stream of byte chunks. Call `HttpServerResponse.stream` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.file`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:483`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a streamed file response for a file system path.
- **Signature hint:** `declare function file(path: string, options?: (Options & { readonly bytesToRead?: FileSystem.SizeInput | undefined; readonly chunkSize?: FileSystem.SizeInput | undefined; readonly offset?: FileSystem.SizeInput | undefined; }) | undefined): Effect.Effect<HttpServerResponse, PlatformError, HttpPlatform>`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.file`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerResponse.file`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.fileWeb`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:506`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a streamed file response for a Web `File`-like value.
- **Signature hint:** `declare function fileWeb(file: Body.HttpBody.FileLike, options?: (Options.WithContent & { readonly bytesToRead?: FileSystem.SizeInput | undefined; readonly chunkSize?: FileSystem.SizeInput | undefined; readonly offset?: FileSystem.SizeInput | undefined; }) | undefined): Effect.Effect<HttpServerResponse, never, HttpPlatform>`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.fileWeb`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerResponse.fileWeb`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.setHeader`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:524`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a response with the specified header set to the supplied value.
- **Signature hint:** `declare function setHeader(key: string, value: string): (self: HttpServerResponse) => HttpServerResponse declare function setHeader(self: HttpServerResponse, key: string, value: string): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.setHeader`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a response with the specified header set to the supplied value. Call `HttpServerResponse.setHeader` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.setHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:545`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a response with all supplied headers set on the existing header map.
- **Signature hint:** `declare function setHeaders(input: Headers.Input): (self: HttpServerResponse) => HttpServerResponse declare function setHeaders(self: HttpServerResponse, input: Headers.Input): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.setHeaders`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a response with all supplied headers set on the existing header map. Call `HttpServerResponse.setHeaders` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.removeCookie`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:563`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a response with the cookie of the specified name removed.
- **Signature hint:** `declare function removeCookie(name: string): (self: HttpServerResponse) => HttpServerResponse declare function removeCookie(self: HttpServerResponse, name: string): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.removeCookie`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a response with the cookie of the specified name removed. Call `HttpServerResponse.removeCookie` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.replaceCookies`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:581`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns a response with its cookie collection replaced by the supplied cookies.
- **Signature hint:** `declare function replaceCookies(cookies: Cookies.Cookies): (self: HttpServerResponse) => HttpServerResponse declare function replaceCookies(self: HttpServerResponse, cookies: Cookies.Cookies): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.replaceCookies`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a response with its cookie collection replaced by the supplied cookies. Call `HttpServerResponse.replaceCookies` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.setCookie`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:600`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets a cookie on the response.
- **Signature hint:** `declare function setCookie(name: string, value: string, options?: Cookies.Cookie['options']): (self: HttpServerResponse) => Effect.Effect<HttpServerResponse, Cookies.CookiesError> declare function setCookie(self: HttpServerResponse, name: string, value: string, options?: Cookies.Cookie['options']): Effect.Effect<HttpServerResponse, Cookies.CookiesError>`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.setCookie`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerResponse.setCookie`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.expireCookie`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:643`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets an expired cookie on an `HttpServerResponse`.
- **Signature hint:** `declare function expireCookie(name: string, options?: Omit<NonNullable<Cookies.Cookie['options']>, 'expires' | 'maxAge'>): (self: HttpServerResponse) => Effect.Effect<HttpServerResponse, Cookies.CookiesError> declare function expireCookie(self: HttpServerResponse, name: string, options?: Omit<NonNullable<Cookies.Cookie['options']>, 'expires' | 'maxAge'>): Effect.Effect<HttpServerResponse, Cookies.CookiesError>`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.expireCookie`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerResponse.expireCookie`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.updateCookies`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:757`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Updates the cookies attached to an `HttpServerResponse` using the supplied function.
- **Signature hint:** `declare function updateCookies(f: (cookies: Cookies.Cookies) => Cookies.Cookies): (self: HttpServerResponse) => HttpServerResponse declare function updateCookies(self: HttpServerResponse, f: (cookies: Cookies.Cookies) => Cookies.Cookies): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.updateCookies`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Updates the cookies attached to an `HttpServerResponse` using the supplied function. Call `HttpServerResponse.updateCookies` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerResponse.mergeCookies`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:789`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Merges additional cookies into the cookies attached to an `HttpServerResponse`.
- **Signature hint:** `declare function mergeCookies(cookies: Cookies.Cookies): (self: HttpServerResponse) => HttpServerResponse declare function mergeCookies(self: HttpServerResponse, cookies: Cookies.Cookies): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.mergeCookies`.
- **Suggested snippet:** Apply `HttpServerResponse.mergeCookies` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpServerResponse.Options (type)`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:68`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Common options accepted by HTTP server response constructors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServerResponse.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.empty`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:121`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an empty HTTP response.
- **Signature hint:** `declare function empty(options?: Options.WithContent | undefined): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.empty`.
- **Suggested snippet:** Construct one representative value with `HttpServerResponse.empty`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.redirect`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:142`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a redirect response with a `Location` header.
- **Signature hint:** `declare function redirect(location: string | URL, options?: Options.WithContent | undefined): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.redirect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a redirect response with a `Location` header. Call `HttpServerResponse.redirect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.uint8Array`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:163`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an HTTP response whose body is a `Uint8Array`.
- **Signature hint:** `declare function uint8Array(body: Uint8Array, options?: Options.WithContentType): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.uint8Array`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an HTTP response whose body is a `Uint8Array`. Call `HttpServerResponse.uint8Array` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.text`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:196`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an HTTP response whose body is a string.
- **Signature hint:** `declare function text(body: string, options?: Options.WithContentType): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.text`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an HTTP response whose body is a string. Call `HttpServerResponse.text` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.urlParams`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:374`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a response from URL parameters using the `application/x-www-form-urlencoded` content type by default.
- **Signature hint:** `declare function urlParams(body: UrlParams.Input, options?: Options.WithContentType | undefined): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.urlParams`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a response from URL parameters using the `application/x-www-form-urlencoded` content type by default. Call `HttpServerResponse.urlParams` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.raw`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:403`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a response with a raw body value.
- **Signature hint:** `declare function raw(body: unknown, options?: Options | undefined): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.raw`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a response with a raw body value. Call `HttpServerResponse.raw` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.formData`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:424`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a response whose body is a Web `FormData` value.
- **Signature hint:** `declare function formData(body: FormData, options?: Options.WithContent | undefined): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.formData`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a response whose body is a Web `FormData` value. Call `HttpServerResponse.formData` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.setCookies`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:809`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Sets multiple cookies on an `HttpServerResponse`.
- **Signature hint:** `declare function setCookies(cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie['options']]>): (self: HttpServerResponse) => Effect.Effect<HttpServerResponse, Cookies.CookiesError, never> declare function setCookies(self: HttpServerResponse, cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie['options']]>): Effect.Effect<HttpServerResponse, Cookies.CookiesError, never>`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.setCookies`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerResponse.setCookies`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.setBody`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:911`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Replaces the body of an `HttpServerResponse`.
- **Signature hint:** `declare function setBody(body: Body.HttpBody): (self: HttpServerResponse) => HttpServerResponse declare function setBody(self: HttpServerResponse, body: Body.HttpBody): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.setBody`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Replaces the body of an `HttpServerResponse`. Call `HttpServerResponse.setBody` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.setStatus`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:929`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **optional**
- **Current description:** Sets the HTTP status code of an `HttpServerResponse`.
- **Signature hint:** `declare function setStatus(status: number, statusText?: string | undefined): (self: HttpServerResponse) => HttpServerResponse declare function setStatus(self: HttpServerResponse, status: number, statusText?: string | undefined): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.setStatus`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Sets the HTTP status code of an `HttpServerResponse`. Call `HttpServerResponse.setStatus` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.toWeb`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:965`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an `HttpServerResponse` to a Web `Response`.
- **Signature hint:** `declare function toWeb(response: HttpServerResponse, options?: { readonly withoutBody?: boolean | undefined; readonly context?: Context.Context<never> | undefined; }): Response`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.toWeb`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpServerResponse.toWeb`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.toClientResponse`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:1043`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Wraps an `HttpServerResponse` as an `HttpClientResponse`.
- **Signature hint:** `declare function toClientResponse(response: HttpServerResponse, options?: { readonly request?: HttpClientRequest.HttpClientRequest | undefined; }): HttpClientResponse.HttpClientResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.toClientResponse`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpServerResponse.toClientResponse`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.fromClientResponse`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:1264`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an `HttpClientResponse` to an `HttpServerResponse`.
- **Signature hint:** `declare function fromClientResponse(response: HttpClientResponse.HttpClientResponse): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.fromClientResponse`.
- **Suggested snippet:** Convert one representative external input with `HttpServerResponse.fromClientResponse` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.fromWeb`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:1357`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts a Web `Response` to an `HttpServerResponse`.
- **Signature hint:** `declare function fromWeb(response: Response): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.fromWeb`.
- **Suggested snippet:** Convert one representative external input with `HttpServerResponse.fromWeb` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.HttpServerResponse`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:53`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Server-side HTTP response model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServerResponse.HttpServerResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.Options (type)`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:83`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Option variants used by response constructors with different body metadata rules.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServerResponse.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.Options.WithContent`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:91`
- **Kind / category:** `namespace-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Response options for constructors whose body determines its own content type and content length.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServerResponse.Options.WithContent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerResponse.Options.WithContentType`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:100`
- **Kind / category:** `namespace-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Response options for constructors that allow overriding the content type while deriving the content length from the body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServerResponse.Options.WithContentType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/HttpServerResponse.jsonUnsafe`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:353`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **discouraged**
- **Current description:** Creates a JSON HTTP response synchronously.
- **Signature hint:** `declare function jsonUnsafe(body: unknown, options?: Options.WithContentType | undefined): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.jsonUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpServerResponse.jsonUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/HttpServerResponse.setCookieUnsafe`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:684`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **discouraged**
- **Current description:** Sets a cookie on an `HttpServerResponse`, throwing if the cookie cannot be encoded.
- **Signature hint:** `declare function setCookieUnsafe(name: string, value: string, options?: Cookies.Cookie['options']): (self: HttpServerResponse) => HttpServerResponse declare function setCookieUnsafe(self: HttpServerResponse, name: string, value: string, options?: Cookies.Cookie['options']): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.setCookieUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpServerResponse.setCookieUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/HttpServerResponse.expireCookieUnsafe`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:722`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **discouraged**
- **Current description:** Sets an expired cookie on an `HttpServerResponse`, throwing if the expiration cookie cannot be encoded.
- **Signature hint:** `declare function expireCookieUnsafe(name: string, options?: Omit<NonNullable<Cookies.Cookie['options']>, 'expires' | 'maxAge'>): (self: HttpServerResponse) => HttpServerResponse declare function expireCookieUnsafe(self: HttpServerResponse, name: string, options?: Omit<NonNullable<Cookies.Cookie['options']>, 'expires' | 'maxAge'>): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.expireCookieUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpServerResponse.expireCookieUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/http/HttpServerResponse.setCookiesUnsafe`

- **Source:** `packages/effect/src/unstable/http/HttpServerResponse.ts:862`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **discouraged**
- **Current description:** Sets multiple cookies on an `HttpServerResponse`, throwing if any cookie cannot be encoded.
- **Signature hint:** `declare function setCookiesUnsafe(cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie['options']]>): (self: HttpServerResponse) => HttpServerResponse declare function setCookiesUnsafe(self: HttpServerResponse, cookies: Iterable<readonly [name: string, value: string, options?: Cookies.Cookie['options']]>): HttpServerResponse`
- **Import guidance:** Start from `import { HttpServerResponse } from "effect/unstable/http"` and use `HttpServerResponse.setCookiesUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpServerResponse.setCookiesUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

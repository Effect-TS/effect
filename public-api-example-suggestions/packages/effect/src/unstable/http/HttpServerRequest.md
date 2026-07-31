# Example Suggestions: `effect/unstable/http/HttpServerRequest`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts`
- **Uncovered API records:** 21
- **Priorities:** 0 required, 8 recommended, 12 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpServerRequest.schemaBodyForm`            |  268 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRequest.schemaBodyMultipart`       |  320 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRequest.schemaBodyFormJson`        |  347 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRequest.HttpServerRequest (value)` |  111 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRequest.ParsedSearchParams`        |  131 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRequest.toURL`                     | 1012 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRequest.toWebResult`               | 1034 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRequest.toWeb`                     | 1075 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServerRequest.MaxBodySize`               |   51 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.searchParamsFromURL`       |  146 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.upgradeChannel`            |  174 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.schemaCookies`             |  195 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.schemaHeaders`             |  209 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.schemaSearchParams`        |  223 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.schemaBodyJson`            |  245 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.schemaBodyUrlParams`       |  296 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.fromClientRequest`         |  393 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.fromWeb`                   |  412 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.toClientRequest`           |  426 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.HttpServerRequest (type)`  |   74 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServerRequest.TypeId`                    |   60 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/http/HttpServerRequest.schemaBodyForm`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:268`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Decodes the current request body as form data.
- **Signature hint:** `declare function schemaBodyForm<A, I extends Partial<Multipart.Persisted>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, Schema.SchemaError | HttpServerError | Multipart.MultipartError, Scope.Scope | FileSystem.FileSystem | Path.Path | HttpServerRequest | RD>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.schemaBodyForm`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRequest.schemaBodyForm`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRequest.schemaBodyMultipart`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:320`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Persists the current multipart request body and decodes it with the supplied schema.
- **Signature hint:** `declare function schemaBodyMultipart<A, I extends Partial<Multipart.Persisted>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, Multipart.MultipartError | Schema.SchemaError, HttpServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path | RD>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.schemaBodyMultipart`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRequest.schemaBodyMultipart`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRequest.schemaBodyFormJson`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:347`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a decoder for a JSON value stored in a form field.
- **Signature hint:** `declare function schemaBodyFormJson<A, RD>(schema: Schema.ConstraintDecoder<A, RD>, options?: ParseOptions | undefined): (field: string) => Effect.Effect<A, Schema.SchemaError | HttpServerError, Scope.Scope | FileSystem.FileSystem | Path.Path | HttpServerRequest | RD>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.schemaBodyFormJson`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRequest.schemaBodyFormJson`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRequest.HttpServerRequest (value)`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:111`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **recommended**
- **Current description:** Service tag for the active server-side HTTP request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.HttpServerRequest`.
- **Suggested snippet:** Consume `HttpServerRequest.HttpServerRequest` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRequest.ParsedSearchParams`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:131`
- **Kind / category:** `root-declaration` / `search params`
- **Priority:** **recommended**
- **Current description:** Service that contains decoded URL query parameters for the current request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.ParsedSearchParams`.
- **Suggested snippet:** Consume `HttpServerRequest.ParsedSearchParams` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRequest.toURL`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:1012`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Attempts to construct an absolute `URL` for a server request safely.
- **Signature hint:** `declare function toURL(self: HttpServerRequest): Option.Option<URL>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.toURL`.
- **Suggested snippet:** Call `HttpServerRequest.toURL` with one input producing a present value and one producing absence, and assert the returned values with `Option.some` and `Option.none()`.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRequest.toWebResult`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:1034`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts an `HttpServerRequest` safely to a Web `Request` as a `Result`.
- **Signature hint:** `declare function toWebResult(self: HttpServerRequest, options?: { readonly signal?: AbortSignal | undefined; readonly context?: Context.Context<never> | undefined; }): Result.Result<Request, RequestError>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.toWebResult`.
- **Suggested snippet:** Call `HttpServerRequest.toWebResult` with one succeeding and one failing input, and assert the returned channels with `Result.succeed` and `Result.fail` without converting expected failure into an exception.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServerRequest.toWeb`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:1075`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts an `HttpServerRequest` to a Web `Request` in `Effect`.
- **Signature hint:** `declare function toWeb(self: HttpServerRequest, options?: { readonly signal?: AbortSignal | undefined; }): Effect.Effect<Request, RequestError>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.toWeb`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRequest.toWeb`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpServerRequest.MaxBodySize`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:51`
- **Kind / category:** `root-declaration` / `fiber refs`
- **Priority:** **optional**
- **Current description:** Provides the `MaxBodySize` fiber reference for configuring request body limits.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.MaxBodySize`.
- **Suggested snippet:** Use `HttpServerRequest.MaxBodySize` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.searchParamsFromURL`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:146`
- **Kind / category:** `root-declaration` / `search params`
- **Priority:** **optional**
- **Current description:** Converts a `URL` object's search parameters into a record.
- **Signature hint:** `declare function searchParamsFromURL(url: URL): ReadonlyRecord<string, string | Array<string>>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.searchParamsFromURL`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a `URL` object's search parameters into a record. Call `HttpServerRequest.searchParamsFromURL` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.upgradeChannel`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:174`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **optional**
- **Current description:** Creates a channel backed by the current request's upgraded socket.
- **Signature hint:** `declare function upgradeChannel<IE = never>(): Channel.Channel<Arr.NonEmptyReadonlyArray<Uint8Array>, HttpServerError | IE | Socket.SocketError, void, Arr.NonEmptyReadonlyArray<string | Uint8Array | Socket.CloseEvent>, IE, unknown, HttpServerRequest>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.upgradeChannel`.
- **Suggested snippet:** Create a finite Channel, apply `HttpServerRequest.upgradeChannel`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.schemaCookies`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:195`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Decodes a schema from the cookies of the current request.
- **Signature hint:** `declare function schemaCookies<A, I extends Readonly<Record<string, string | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, Schema.SchemaError, RD | HttpServerRequest>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.schemaCookies`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRequest.schemaCookies`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.schemaHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:209`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Decodes a schema from the headers of the current request.
- **Signature hint:** `declare function schemaHeaders<A, I extends Readonly<Record<string, string | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, Schema.SchemaError, HttpServerRequest | RD>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.schemaHeaders`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRequest.schemaHeaders`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.schemaSearchParams`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:223`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Decodes a schema from the parsed search parameters of the current request.
- **Signature hint:** `declare function schemaSearchParams<A, I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, Schema.SchemaError, ParsedSearchParams | RD>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.schemaSearchParams`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRequest.schemaSearchParams`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.schemaBodyJson`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:245`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Reads the current request body as JSON and decodes it with the supplied schema.
- **Signature hint:** `declare function schemaBodyJson<A, RD>(schema: Schema.ConstraintDecoder<A, RD>, options?: ParseOptions | undefined): Effect.Effect<A, HttpServerError | Schema.SchemaError, HttpServerRequest | RD>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.schemaBodyJson`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRequest.schemaBodyJson`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.schemaBodyUrlParams`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:296`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Reads the current request body as URL-encoded parameters and decodes them with the supplied schema.
- **Signature hint:** `declare function schemaBodyUrlParams<A, I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, HttpServerError | Schema.SchemaError, HttpServerRequest | RD>`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.schemaBodyUrlParams`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServerRequest.schemaBodyUrlParams`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.fromClientRequest`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:393`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Creates an `HttpServerRequest` view of an `HttpClientRequest`.
- **Signature hint:** `declare function fromClientRequest(request: HttpClientRequest.HttpClientRequest): HttpServerRequest`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.fromClientRequest`.
- **Suggested snippet:** Convert one representative external input with `HttpServerRequest.fromClientRequest` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.fromWeb`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:412`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Wraps a Web `Request` as an `HttpServerRequest`.
- **Signature hint:** `declare function fromWeb(request: globalThis.Request): HttpServerRequest`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.fromWeb`.
- **Suggested snippet:** Convert one representative external input with `HttpServerRequest.fromWeb` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.toClientRequest`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:426`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an `HttpServerRequest` into an `HttpClientRequest`.
- **Signature hint:** `declare function toClientRequest(request: HttpServerRequest): HttpClientRequest.HttpClientRequest`
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.toClientRequest`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpServerRequest.toClientRequest`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServerRequest.HttpServerRequest (type)`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:74`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Server-side representation of an incoming HTTP request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServerRequest.HttpServerRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/HttpServerRequest.TypeId`

- **Source:** `packages/effect/src/unstable/http/HttpServerRequest.ts:60`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier for `HttpServerRequest` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServerRequest } from "effect/unstable/http"` and use `HttpServerRequest.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpServerRequest.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

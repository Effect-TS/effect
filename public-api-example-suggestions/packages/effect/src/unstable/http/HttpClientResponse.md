# Example Suggestions: `effect/unstable/http/HttpClientResponse`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 7 recommended, 4 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpClientResponse.schemaBodyJson`      |   35 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientResponse.schemaBodyUrlParams` |   42 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientResponse.schemaHeaders`       |   49 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientResponse.stream`              |  145 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientResponse.matchStatus`         |  155 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientResponse.filterStatus`        |  207 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientResponse.filterStatusOk`      |  234 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpClientResponse.fromWeb`             |   80 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpClientResponse.schemaJson`          |   89 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpClientResponse.schemaNoBody`        |  119 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpClientResponse.HttpClientResponse`  |   66 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpClientResponse.TypeId`              |   58 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/http/HttpClientResponse.schemaBodyJson`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:35`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a decoder that reads a response JSON body and decodes it with the supplied schema.
- **Signature hint:** `declare function schemaBodyJson<S extends Schema.Constraint>(schema: S, options?: ParseOptions | undefined): <E>(self: HttpIncomingMessage.HttpIncomingMessage<E>) => Effect.Effect<S['Type'], E | Schema.SchemaError, S['DecodingServices']>`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.schemaBodyJson`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientResponse.schemaBodyJson`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientResponse.schemaBodyUrlParams`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:42`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a decoder that reads response URL-encoded body parameters and decodes them with the supplied schema.
- **Signature hint:** `declare function schemaBodyUrlParams<A, I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): <E>(self: HttpIncomingMessage.HttpIncomingMessage<E>) => Effect.Effect<A, E | Schema.SchemaError, RD>`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.schemaBodyUrlParams`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientResponse.schemaBodyUrlParams`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientResponse.schemaHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:49`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a decoder that validates and decodes response headers with the supplied schema.
- **Signature hint:** `declare function schemaHeaders<A, I extends Readonly<Record<string, string | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): <E>(self: HttpIncomingMessage.HttpIncomingMessage<E>) => Effect.Effect<A, Schema.SchemaError, RD>`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.schemaHeaders`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientResponse.schemaHeaders`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientResponse.stream`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:145`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Converts an effect producing an `HttpClientResponse` into a stream of response body bytes.
- **Signature hint:** `declare function stream<E, R>(effect: Effect.Effect<HttpClientResponse, E, R>): Stream.Stream<Uint8Array, Error.HttpClientError | E, R>`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.stream`.
- **Suggested snippet:** Create a finite stream, apply `HttpClientResponse.stream`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientResponse.matchStatus`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:155`
- **Kind / category:** `root-declaration` / `pattern matching`
- **Priority:** **recommended**
- **Current description:** Pattern matches on a response status, checking exact status handlers before status-class handlers and `orElse`.
- **Signature hint:** `declare function matchStatus<const Cases extends { readonly [status: number]: (_: HttpClientResponse) => any; readonly '2xx'?: (_: HttpClientResponse) => any; readonly '3xx'?: (_: HttpClientResponse) => any; readonly '4xx'?: (_: HttpClientResponse) => any; readonly '5xx'?: (_: HttpClientResponse) => any; readonly orElse: (_: HttpClientResponse) => any; }>(cases: Cases): (self: HttpClientResponse) => Cases[keyof Cases] extends (_: any) => infer R ? Unify<R> : never declare function matchStatus<const Cases extends { readonly [status: number]: (_: HttpClientResponse) => any; readonly '2xx'?: (_: HttpClientResponse) => any; readonly '3xx'?: (_: HttpClientResponse) => any; readonly '4xx'?: (_: HttpClientResponse) => any; readonly '5xx'?: (_: HttpClientResponse) => any; readonly orElse: (_: HttpClientResponse) => any; }>(self: HttpClientResponse, cases: Cases): Cases[keyof Cases] extends (_: any) => infer R ? Unify<R> : never`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.matchStatus`.
- **Suggested snippet:** Create one value for each meaningful branch handled by `HttpClientResponse.matchStatus`, invoke the matcher or fold directly, and assert the distinct branch results with minimal callbacks.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientResponse.filterStatus`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:207`
- **Kind / category:** `root-declaration` / `filters`
- **Priority:** **recommended**
- **Current description:** Succeeds with the response when its status satisfies the predicate, otherwise fails with `HttpClientError`.
- **Signature hint:** `declare function filterStatus(f: (status: number) => boolean): (self: HttpClientResponse) => Effect.Effect<HttpClientResponse, Error.HttpClientError> declare function filterStatus(self: HttpClientResponse, f: (status: number) => boolean): Effect.Effect<HttpClientResponse, Error.HttpClientError>`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.filterStatus`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientResponse.filterStatus`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClientResponse.filterStatusOk`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:234`
- **Kind / category:** `root-declaration` / `filters`
- **Priority:** **recommended**
- **Current description:** Succeeds with the response only when its status is in the 2xx range, otherwise fails with `HttpClientError`.
- **Signature hint:** `declare function filterStatusOk(self: HttpClientResponse): Effect.Effect<HttpClientResponse, Error.HttpClientError>`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.filterStatusOk`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientResponse.filterStatusOk`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpClientResponse.fromWeb`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:80`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Wraps a Web `Response` and its original `HttpClientRequest` as an `HttpClientResponse`.
- **Signature hint:** `declare function fromWeb(request: HttpClientRequest.HttpClientRequest, source: Response): HttpClientResponse`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.fromWeb`.
- **Suggested snippet:** Convert one representative external input with `HttpClientResponse.fromWeb` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientResponse.schemaJson`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:89`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Creates a decoder for a response's status, headers, and JSON body using the supplied schema.
- **Signature hint:** `declare function schemaJson<A, I extends { readonly status?: number | undefined; readonly headers?: Readonly<Record<string, string | undefined>> | undefined; readonly body?: unknown; }, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): (self: HttpClientResponse) => Effect.Effect<A, Schema.SchemaError | Error.HttpClientError, RD>`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.schemaJson`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientResponse.schemaJson`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientResponse.schemaNoBody`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:119`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Creates a decoder for a response's status and headers without reading a response body.
- **Signature hint:** `declare function schemaNoBody<A, I extends { readonly status?: number | undefined; readonly headers?: Readonly<Record<string, string>> | undefined; }, RD, RE>(schema: Schema.Codec<A, I, RD, RE>, options?: ParseOptions | undefined): (self: HttpClientResponse) => Effect.Effect<A, Schema.SchemaError, RD>`
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.schemaNoBody`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClientResponse.schemaNoBody`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClientResponse.HttpClientResponse`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:66`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Model of an HTTP client response, including the original request, status, cookies, headers, and body accessors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClientResponse.HttpClientResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/HttpClientResponse.TypeId`

- **Source:** `packages/effect/src/unstable/http/HttpClientResponse.ts:58`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type identifier for `HttpClientResponse` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClientResponse } from "effect/unstable/http"` and use `HttpClientResponse.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpClientResponse.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

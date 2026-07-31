# Example Suggestions: `effect/unstable/http/HttpClient`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpClient.ts`
- **Uncovered API records:** 56
- **Priorities:** 1 required, 25 recommended, 30 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                                 | Line | Kind                    | Priority        |
| ----------------------------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/http/HttpClient.withScope`                                         | 1437 | `root-declaration`      | **required**    |
| `effect/unstable/http/HttpClient.layerMergedContext`                                | 1554 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.isHttpClient`                                      |   54 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.HttpClient`                                        |  150 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.execute`                                           |  166 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.get`                                               |  176 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.head`                                              |  188 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.post`                                              |  200 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.patch`                                             |  212 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.put`                                               |  224 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.del`                                               |  236 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.options`                                           |  248 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.transform`                                         |  264 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.transformResponse`                                 |  296 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.catch`                                             |  338 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.catchTag`                                          |  347 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.catchTags`                                         |  389 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.filterOrElse`                                      |  483 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.filterOrFail`                                      |  528 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.filterStatus`                                      |  555 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.filterStatusOk`                                    |  570 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.makeWith`                                          |  583 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.make`                                              |  628 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.mapRequest`                                        |  734 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.mapRequestEffect`                                  |  756 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.mapRequestInput`                                   |  779 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpClient.mapRequestInputEffect`                             |  801 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.retry`                                             |  854 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.retryTransient`                                    |  892 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.withRateLimiter`                                   | 1050 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.tap`                                               | 1332 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.tapError`                                          | 1354 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.tapRequest`                                        | 1376 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.withCookiesRef`                                    | 1404 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.followRedirects`                                   | 1458 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.TracerDisabledWhen`                                | 1508 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.TracerHeaderFilter`                                | 1520 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.TracerPropagationEnabled`                          | 1532 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.SpanNameGenerator`                                 | 1542 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.HttpClient (type) (type)`                          |   62 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpClient.HttpClient (type) (type)`                          |   69 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpClient.HttpClient.With`                                   |   80 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpClient.HttpClient.Preprocess`                             |  124 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpClient.HttpClient.Postprocess`                            |  134 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpClient.Retry`                                             |  823 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpClient.Retry.Return`                                      |  834 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter`                                   |  989 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter.Options`                           | 1000 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter.Options.limiter`                   | 1004 | `member`                | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter.Options.window`                    | 1008 | `member`                | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter.Options.limit`                     | 1012 | `member`                | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter.Options.key`                       | 1018 | `member`                | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter.Options.algorithm`                 | 1022 | `member`                | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter.Options.tokens`                    | 1026 | `member`                | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter.Options.disableResponseInspection` | 1030 | `member`                | **optional**    |
| `effect/unstable/http/HttpClient.WithRateLimiter.Options.disableAdaptiveLearning`   | 1034 | `member`                | **optional**    |

## Required

### `effect/unstable/http/HttpClient.withScope`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1437`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Attaches the lifetime of the `HttpClientRequest` to a `Scope`.
- **Signature hint:** `declare function withScope<E, R>(self: HttpClient.With<E, R>): HttpClient.With<E, R | Scope.Scope>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.withScope`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Attaches the lifetime of the `HttpClientRequest` to a `Scope`. Call `HttpClient.withScope` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/unstable/http/HttpClient.layerMergedContext`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1554`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates an `HttpClient` layer and merges the layer construction context into client response effects.
- **Signature hint:** `declare function layerMergedContext<E, R>(effect: Effect.Effect<HttpClient, E, R>): Layer.Layer<HttpClient, E, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.layerMergedContext`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpClient.layerMergedContext`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.isHttpClient`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:54`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if the provided value is an `HttpClient`.
- **Signature hint:** `declare function isHttpClient(u: unknown): u is HttpClient`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.isHttpClient`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpClient.isHttpClient` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.HttpClient`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:150`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the default outgoing HTTP client service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.HttpClient`.
- **Suggested snippet:** Consume `HttpClient.HttpClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.execute`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:166`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Executes a prebuilt `HttpClientRequest` using the `HttpClient` service from the environment.
- **Signature hint:** `declare function execute(request: HttpClientRequest.HttpClientRequest): Effect.Effect<HttpClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.execute`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClient.execute`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.get`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:176`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Executes a `GET` request using the `HttpClient` service from the environment.
- **Signature hint:** `declare function get(url: string | URL, options?: HttpClientRequest.Options.NoUrl | undefined): Effect.Effect<HttpClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.get`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClient.get`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.head`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:188`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Executes a `HEAD` request using the `HttpClient` service from the environment.
- **Signature hint:** `declare function head(url: string | URL, options?: HttpClientRequest.Options.NoUrl | undefined): Effect.Effect<HttpClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.head`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClient.head`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.post`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:200`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Executes a `POST` request using the `HttpClient` service from the environment.
- **Signature hint:** `declare function post(url: string | URL, options?: HttpClientRequest.Options.NoUrl | undefined): Effect.Effect<HttpClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.post`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClient.post`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.patch`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:212`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Executes a `PATCH` request using the `HttpClient` service from the environment.
- **Signature hint:** `declare function patch(url: string | URL, options?: HttpClientRequest.Options.NoUrl | undefined): Effect.Effect<HttpClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.patch`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClient.patch`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.put`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:224`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Executes a `PUT` request using the `HttpClient` service from the environment.
- **Signature hint:** `declare function put(url: string | URL, options?: HttpClientRequest.Options.NoUrl | undefined): Effect.Effect<HttpClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.put`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClient.put`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.del`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:236`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Executes a `DELETE` request using the `HttpClient` service from the environment.
- **Signature hint:** `declare function del(url: string | URL, options?: HttpClientRequest.Options.NoUrl | undefined): Effect.Effect<HttpClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.del`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClient.del`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.options`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:248`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Executes an `OPTIONS` request using the `HttpClient` service from the environment.
- **Signature hint:** `declare function options(url: string | URL, options?: HttpClientRequest.Options.NoUrl | undefined): Effect.Effect<HttpClientResponse.HttpClientResponse, Error.HttpClientError, HttpClient>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.options`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpClient.options`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.transform`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:264`
- **Kind / category:** `root-declaration` / `mapping & sequencing`
- **Priority:** **recommended**
- **Current description:** Transforms a client by wrapping the response effect for each request.
- **Signature hint:** `declare function transform<E, R, E1, R1>(f: (effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>, request: HttpClientRequest.HttpClientRequest) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>): (self: HttpClient.With<E, R>) => HttpClient.With<E | E1, R | R1> declare function transform<E, R, E1, R1>(self: HttpClient.With<E, R>, f: (effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>, request: HttpClientRequest.HttpClientRequest) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>): HttpClient.With<E | E1, R | R1>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.transform`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Transforms a client by wrapping the response effect for each request. Call `HttpClient.transform` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.transformResponse`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:296`
- **Kind / category:** `root-declaration` / `mapping & sequencing`
- **Priority:** **recommended**
- **Current description:** Transforms a client by applying an effectful transformation to each response effect.
- **Signature hint:** `declare function transformResponse<E, R, E1, R1>(f: (effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>): (self: HttpClient.With<E, R>) => HttpClient.With<E1, R1> declare function transformResponse<E, R, E1, R1>(self: HttpClient.With<E, R>, f: (effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>): HttpClient.With<E1, R1>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.transformResponse`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Transforms a client by applying an effectful transformation to each response effect. Call `HttpClient.transformResponse` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.catch`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:338`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Handles all client failures with an effectful recovery function and returns a transformed client.
- **Signature hint:** `declare const _catch: { <E, E2, R2>(f: (e: E) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E2, R2 | R>; <E, R, A2, E2, R2>(self: HttpClient.With<E, R>, f: (e: E) => Effect.Effect<A2, E2, R2>): HttpClient.With<E2, R | R2>; } export { _catch as catch }`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.catch`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Handles all client failures with an effectful recovery function and returns a transformed client. Call `HttpClient.catch` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.catchTag`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:347`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Handles client failures with one or more matching `_tag` values and returns a transformed client.
- **Signature hint:** `declare function catchTag<K extends Tags<E> | NonEmptyReadonlyArray<Tags<E>>, E, E1, R1>(tag: K, f: (e: ExtractTag<NoInfer<E>, K extends NonEmptyReadonlyArray<string> ? K[number] : K>) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E1 | ExcludeTag<E, K extends NonEmptyReadonlyArray<string> ? K[number] : K>, R1 | R> declare function catchTag<R, E, K extends Tags<E> | NonEmptyReadonlyArray<Tags<E>>, R1, E1>(self: HttpClient.With<E, R>, tag: K, f: (e: ExtractTag<E, K extends NonEmptyReadonlyArray<string> ? K[number] : K>) => Effect.Effect<HttpClientResponse.HttpClientResponse, E1, R1>): HttpClient.With<E1 | ExcludeTag<E, K extends NonEmptyReadonlyArray<string> ? K[number] : K>, R1 | R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.catchTag`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Handles client failures with one or more matching `_tag` values and returns a transformed client. Call `HttpClient.catchTag` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.catchTags`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:389`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **recommended**
- **Current description:** Handles client failures by matching their `_tag` values against a case map.
- **Signature hint:** `declare function catchTags<E, Cases extends { [K in Extract<E, { _tag: string; }>['_tag']]+?: (error: Extract<E, { _tag: K; }>) => Effect.Effect<HttpClientResponse.HttpClientResponse, any, any>; } & (unknown extends E ? {} : { [K in Exclude<keyof Cases, Extract<E, { _tag: string; }>['_tag']>]: never; })>(cases: Cases): <R>(self: HttpClient.With<E, R>) => HttpClient.With<Exclude<E, { _tag: keyof Cases; }> | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never; }[keyof Cases], R | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never; }[keyof Cases]> declare function catchTags<E extends { _tag: string; }, R, Cases extends { [K in Extract<E, { _tag: string; }>['_tag']]+?: (error: Extract<E, { _tag: K; }>) => Effect.Effect<HttpClientResponse.HttpClientResponse, any, any>; } & (unknown extends E ? {} : { [K in Exclude<keyof Cases, Extract<E, { _tag: string; }>['_tag']>]: never; })>(self: HttpClient.With<E, R>, cases: Cases): HttpClient.With<Exclude<E, { _tag: keyof Cases; }> | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, infer E, any> ? E : never; }[keyof Cases], R | { [K in keyof Cases]: Cases[K] extends (...args: Array<any>) => Effect.Effect<any, any, infer R> ? R : never; }[keyof Cases]>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.catchTags`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Handles client failures by matching their `_tag` values against a case map. Call `HttpClient.catchTags` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.filterOrElse`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:483`
- **Kind / category:** `root-declaration` / `filters`
- **Priority:** **recommended**
- **Current description:** Filters the result of a response, or runs an alternative effect if the predicate fails.
- **Signature hint:** `declare function filterOrElse<B extends HttpClientResponse.HttpClientResponse, E2, R2>(refinement: Predicate.Refinement<NoInfer<HttpClientResponse.HttpClientResponse>, B>, orElse: (response: EqualsWith<HttpClientResponse.HttpClientResponse, B, NoInfer<HttpClientResponse.HttpClientResponse>, Exclude<NoInfer<HttpClientResponse.HttpClientResponse>, B>>) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E2 | E, R2 | R> declare function filterOrElse<E2, R2>(predicate: Predicate.Predicate<NoInfer<HttpClientResponse.HttpClientResponse>>, orElse: (response: NoInfer<HttpClientResponse.HttpClientResponse>) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E2 | E, R2 | R> declare function filterOrElse<E, R, B extends HttpClientResponse.HttpClientResponse, E2, R2>(self: HttpClient.With<E, R>, refinement: Predicate.Refinement<HttpClientResponse.HttpClientResponse, B>, orElse: (response: EqualsWith<HttpClientResponse.HttpClientResponse, B, HttpClientResponse.HttpClientResponse, Exclude<HttpClientResponse.HttpClientResponse, B>>) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>): HttpClient.With<E2 | E, R2 | R> declare function filterOrElse<E, R, E2, R2>(self: HttpClient.With<E, R>, predicate: Predicate.Predicate<HttpClientResponse.HttpClientResponse>, orElse: (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<HttpClientResponse.HttpClientResponse, E2, R2>): HttpClient.With<E2 | E, R2 | R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.filterOrElse`.
- **Suggested snippet:** Apply `HttpClient.filterOrElse` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.filterOrFail`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:528`
- **Kind / category:** `root-declaration` / `filters`
- **Priority:** **recommended**
- **Current description:** Filters successful responses, or fails with the error produced by `orFailWith` when the predicate does not match.
- **Signature hint:** `declare function filterOrFail<B extends HttpClientResponse.HttpClientResponse, E2>(refinement: Predicate.Refinement<NoInfer<HttpClientResponse.HttpClientResponse>, B>, orFailWith: (response: NoInfer<HttpClientResponse.HttpClientResponse>) => E2): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E2 | E, R> declare function filterOrFail<E2>(predicate: Predicate.Predicate<NoInfer<HttpClientResponse.HttpClientResponse>>, orFailWith: (response: NoInfer<HttpClientResponse.HttpClientResponse>) => E2): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E2 | E, R> declare function filterOrFail<E, R, B extends HttpClientResponse.HttpClientResponse, E2>(self: HttpClient.With<E, R>, refinement: Predicate.Refinement<NoInfer<HttpClientResponse.HttpClientResponse>, B>, orFailWith: (response: NoInfer<HttpClientResponse.HttpClientResponse>) => E2): HttpClient.With<E2 | E, R> declare function filterOrFail<E, R, E2>(self: HttpClient.With<E, R>, predicate: Predicate.Predicate<NoInfer<HttpClientResponse.HttpClientResponse>>, orFailWith: (response: NoInfer<HttpClientResponse.HttpClientResponse>) => E2): HttpClient.With<E2 | E, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.filterOrFail`.
- **Suggested snippet:** Apply `HttpClient.filterOrFail` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.filterStatus`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:555`
- **Kind / category:** `root-declaration` / `filters`
- **Priority:** **recommended**
- **Current description:** Filters responses by HTTP status code.
- **Signature hint:** `declare function filterStatus(f: (status: number) => boolean): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | Error.HttpClientError, R> declare function filterStatus<E, R>(self: HttpClient.With<E, R>, f: (status: number) => boolean): HttpClient.With<E | Error.HttpClientError, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.filterStatus`.
- **Suggested snippet:** Apply `HttpClient.filterStatus` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.filterStatusOk`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:570`
- **Kind / category:** `root-declaration` / `filters`
- **Priority:** **recommended**
- **Current description:** Filters responses that return a 2xx status code.
- **Signature hint:** `declare function filterStatusOk<E, R>(self: HttpClient.With<E, R>): HttpClient.With<E | Error.HttpClientError, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.filterStatusOk`.
- **Suggested snippet:** Apply `HttpClient.filterStatusOk` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.makeWith`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:583`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs an `HttpClient.With` from a preprocessing function and a postprocessing function.
- **Signature hint:** `declare function makeWith<E2, R2, E, R>(postprocess: (request: Effect.Effect<HttpClientRequest.HttpClientRequest, E2, R2>) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>, preprocess: HttpClient.Preprocess<E2, R2>): HttpClient.With<E, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.makeWith`.
- **Suggested snippet:** Construct one representative value with `HttpClient.makeWith`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.make`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:628`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs an `HttpClient` from a low-level request runner.
- **Signature hint:** `declare function make(f: (request: HttpClientRequest.HttpClientRequest, url: URL, signal: AbortSignal, fiber: Fiber.Fiber<HttpClientResponse.HttpClientResponse, Error.HttpClientError>) => Effect.Effect<HttpClientResponse.HttpClientResponse, Error.HttpClientError>): HttpClient`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.make`.
- **Suggested snippet:** Construct one representative value with `HttpClient.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.mapRequest`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:734`
- **Kind / category:** `root-declaration` / `mapping & sequencing`
- **Priority:** **recommended**
- **Current description:** Appends a transformation of the request object before sending it.
- **Signature hint:** `declare function mapRequest(f: (a: HttpClientRequest.HttpClientRequest) => HttpClientRequest.HttpClientRequest): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R> declare function mapRequest<E, R>(self: HttpClient.With<E, R>, f: (a: HttpClientRequest.HttpClientRequest) => HttpClientRequest.HttpClientRequest): HttpClient.With<E, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.mapRequest`.
- **Suggested snippet:** Apply `HttpClient.mapRequest` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.mapRequestEffect`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:756`
- **Kind / category:** `root-declaration` / `mapping & sequencing`
- **Priority:** **recommended**
- **Current description:** Appends an effectful transformation of the request object before sending it.
- **Signature hint:** `declare function mapRequestEffect<E2, R2>(f: (a: HttpClientRequest.HttpClientRequest) => Effect.Effect<HttpClientRequest.HttpClientRequest, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2> declare function mapRequestEffect<E, R, E2, R2>(self: HttpClient.With<E, R>, f: (a: HttpClientRequest.HttpClientRequest) => Effect.Effect<HttpClientRequest.HttpClientRequest, E2, R2>): HttpClient.With<E | E2, R | R2>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.mapRequestEffect`.
- **Suggested snippet:** Apply `HttpClient.mapRequestEffect` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpClient.mapRequestInput`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:779`
- **Kind / category:** `root-declaration` / `mapping & sequencing`
- **Priority:** **recommended**
- **Current description:** Prepends a transformation of the request object before sending it.
- **Signature hint:** `declare function mapRequestInput(f: (a: HttpClientRequest.HttpClientRequest) => HttpClientRequest.HttpClientRequest): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R> declare function mapRequestInput<E, R>(self: HttpClient.With<E, R>, f: (a: HttpClientRequest.HttpClientRequest) => HttpClientRequest.HttpClientRequest): HttpClient.With<E, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.mapRequestInput`.
- **Suggested snippet:** Apply `HttpClient.mapRequestInput` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpClient.mapRequestInputEffect`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:801`
- **Kind / category:** `root-declaration` / `mapping & sequencing`
- **Priority:** **optional**
- **Current description:** Prepends an effectful transformation of the request object before sending it.
- **Signature hint:** `declare function mapRequestInputEffect<E2, R2>(f: (a: HttpClientRequest.HttpClientRequest) => Effect.Effect<HttpClientRequest.HttpClientRequest, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2> declare function mapRequestInputEffect<E, R, E2, R2>(self: HttpClient.With<E, R>, f: (a: HttpClientRequest.HttpClientRequest) => Effect.Effect<HttpClientRequest.HttpClientRequest, E2, R2>): HttpClient.With<E | E2, R | R2>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.mapRequestInputEffect`.
- **Suggested snippet:** Apply `HttpClient.mapRequestInputEffect` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.retry`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:854`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Retries the request based on a provided schedule or policy.
- **Signature hint:** `declare function retry<E, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(options: O): <R>(self: HttpClient.With<E, R>) => Retry.Return<R, E, O> declare function retry<B, E, ES, R1>(policy: Schedule.Schedule<B, NoInfer<E>, ES, R1>): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E | ES, R1 | R> declare function retry<E, R, O extends NoExcessProperties<Effect.Retry.Options<E>, O>>(self: HttpClient.With<E, R>, options: O): Retry.Return<R, E, O> declare function retry<E, R, B, ES, R1>(self: HttpClient.With<E, R>, policy: Schedule.Schedule<B, E, ES, R1>): HttpClient.With<E | ES, R1 | R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.retry`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Retries the request based on a provided schedule or policy. Call `HttpClient.retry` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.retryTransient`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:892`
- **Kind / category:** `root-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Retries common transient errors, such as rate limiting, timeouts or network issues.
- **Signature hint:** `declare function retryTransient<E, B = never, ES = never, R1 = never, const RetryOn extends 'errors-only' | 'response-only' | 'errors-and-responses' = 'errors-only' | 'response-only' | 'errors-and-responses', Input = RetryOn extends 'errors-only' ? E : RetryOn extends 'response-only' ? HttpClientResponse.HttpClientResponse : HttpClientResponse.HttpClientResponse | E>(options: { readonly retryOn?: RetryOn | undefined; readonly while?: Predicate.Predicate<NoInfer<E | ES>>; readonly schedule?: Schedule.Schedule<B, NoInfer<Input>, ES, R1>; readonly times?: number; }): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E | ES, R1 | R> declare function retryTransient<E, R, B = never, ES = never, R1 = never, const RetryOn extends 'errors-only' | 'response-only' | 'errors-and-responses' = 'errors-only' | 'response-only' | 'errors-and-responses', Input = RetryOn extends 'errors-only' ? E : RetryOn extends 'response-only' ? HttpClientResponse.HttpClientResponse : HttpClientResponse.HttpClientResponse | E>(self: HttpClient.With<E, R>, options: { readonly retryOn?: RetryOn | undefined; readonly while?: Predicate.Predicate<NoInfer<E | ES>>; readonly schedule?: Schedule.Schedule<B, NoInfer<Input>, ES, R1>; readonly times?: number; }): HttpClient.With<E | ES, R1 | R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.retryTransient`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Retries common transient errors, such as rate limiting, timeouts or network issues. Call `HttpClient.retryTransient` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.withRateLimiter`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1050`
- **Kind / category:** `root-declaration` / `rate limiting`
- **Priority:** **optional**
- **Current description:** Applies request rate limiting using the `RateLimiter` service.
- **Signature hint:** `declare function withRateLimiter(options: WithRateLimiter.Options): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | RateLimiter.RateLimiterError, R> declare function withRateLimiter<E, R>(self: HttpClient.With<E, R>, options: WithRateLimiter.Options): HttpClient.With<E | RateLimiter.RateLimiterError, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.withRateLimiter`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Applies request rate limiting using the `RateLimiter` service. Call `HttpClient.withRateLimiter` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.tap`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1332`
- **Kind / category:** `root-declaration` / `mapping & sequencing`
- **Priority:** **optional**
- **Current description:** Performs an additional effect after a successful request.
- **Signature hint:** `declare function tap<_, E2, R2>(f: (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2> declare function tap<E, R, _, E2, R2>(self: HttpClient.With<E, R>, f: (response: HttpClientResponse.HttpClientResponse) => Effect.Effect<_, E2, R2>): HttpClient.With<E | E2, R | R2>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.tap`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Performs an additional effect after a successful request. Call `HttpClient.tap` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.tapError`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1354`
- **Kind / category:** `root-declaration` / `mapping & sequencing`
- **Priority:** **optional**
- **Current description:** Performs an additional effect after an unsuccessful request.
- **Signature hint:** `declare function tapError<_, E, E2, R2>(f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>): <R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2> declare function tapError<E, R, _, E2, R2>(self: HttpClient.With<E, R>, f: (e: NoInfer<E>) => Effect.Effect<_, E2, R2>): HttpClient.With<E | E2, R | R2>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.tapError`.
- **Suggested snippet:** Create or capture `HttpClient.tapError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.tapRequest`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1376`
- **Kind / category:** `root-declaration` / `mapping & sequencing`
- **Priority:** **optional**
- **Current description:** Performs an additional effect on the request before sending it.
- **Signature hint:** `declare function tapRequest<_, E2, R2>(f: (a: HttpClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E | E2, R | R2> declare function tapRequest<E, R, _, E2, R2>(self: HttpClient.With<E, R>, f: (a: HttpClientRequest.HttpClientRequest) => Effect.Effect<_, E2, R2>): HttpClient.With<E | E2, R | R2>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.tapRequest`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Performs an additional effect on the request before sending it. Call `HttpClient.tapRequest` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.withCookiesRef`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1404`
- **Kind / category:** `root-declaration` / `cookies`
- **Priority:** **optional**
- **Current description:** Adds a `Ref` of cookies to the client for handling cookies across requests.
- **Signature hint:** `declare function withCookiesRef(ref: Ref.Ref<Cookies.Cookies>): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R> declare function withCookiesRef<E, R>(self: HttpClient.With<E, R>, ref: Ref.Ref<Cookies.Cookies>): HttpClient.With<E, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.withCookiesRef`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a `Ref` of cookies to the client for handling cookies across requests. Call `HttpClient.withCookiesRef` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.followRedirects`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1458`
- **Kind / category:** `root-declaration` / `redirects`
- **Priority:** **optional**
- **Current description:** Enables following HTTP redirects up to a specified number of times.
- **Signature hint:** `declare function followRedirects(maxRedirects?: number | undefined): <E, R>(self: HttpClient.With<E, R>) => HttpClient.With<E, R> declare function followRedirects<E, R>(self: HttpClient.With<E, R>, maxRedirects?: number | undefined): HttpClient.With<E, R>`
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.followRedirects`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Enables following HTTP redirects up to a specified number of times. Call `HttpClient.followRedirects` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.TracerDisabledWhen`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1508`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for a predicate that disables client-side tracing for matching outgoing requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.TracerDisabledWhen`.
- **Suggested snippet:** Consume `HttpClient.TracerDisabledWhen` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.TracerHeaderFilter`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1520`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for filtering request and response headers added to client spans.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.TracerHeaderFilter`.
- **Suggested snippet:** Consume `HttpClient.TracerHeaderFilter` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.TracerPropagationEnabled`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1532`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference that controls whether outgoing client spans are propagated to request headers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.TracerPropagationEnabled`.
- **Suggested snippet:** Consume `HttpClient.TracerPropagationEnabled` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.SpanNameGenerator`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1542`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for generating the span name used for outgoing client request spans.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpClient } from "effect/unstable/http"` and use `HttpClient.SpanNameGenerator`.
- **Suggested snippet:** Consume `HttpClient.SpanNameGenerator` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.HttpClient (type) (type)`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:62`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP client whose requests produce `HttpClientResponse` values and can fail with `HttpClientError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClient.HttpClient (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.HttpClient (type) (type)`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:69`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level members associated with `HttpClient`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClient.HttpClient (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.HttpClient.With`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:80`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parameterized HTTP client that may fail with `E` and require environment `R`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClient.HttpClient.With`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.HttpClient.Preprocess`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:124`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effectful transformation applied to a request before the client executes it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClient.HttpClient.Preprocess`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.HttpClient.Postprocess`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:134`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Function that turns a preprocessed request effect into the response effect executed by the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClient.HttpClient.Postprocess`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.Retry`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:823`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level helpers for retrying HTTP clients.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClient.Retry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.Retry.Return`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:834`
- **Kind / category:** `namespace-declaration` / `error handling`
- **Priority:** **optional**
- **Current description:** Computes the client type returned by `retry` for a given set of retry options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClient.Retry.Return`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:989`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing configuration types for `withRateLimiter`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClient.WithRateLimiter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter.Options`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1000`
- **Kind / category:** `namespace-declaration` / `rate limiting`
- **Priority:** **optional**
- **Current description:** Options used to configure `withRateLimiter`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpClient.WithRateLimiter.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter.Options.limiter`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1004`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The `RateLimiter` service to use for rate limiting.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClient.WithRateLimiter.Options.limiter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter.Options.window`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1008`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The initial rate limit window duration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClient.WithRateLimiter.Options.window` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter.Options.limit`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1012`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The initial maximum number of allowed requests in the window.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClient.WithRateLimiter.Options.limit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter.Options.key`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1018`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The key to identify the rate limit. Requests with the same key will share the same rate limit. This can be used to implement per-user or per-endpoint rate limits.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClient.WithRateLimiter.Options.key` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter.Options.algorithm`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1022`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Defaults to `"fixed-window"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClient.WithRateLimiter.Options.algorithm` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter.Options.tokens`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1026`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Defaults to `1`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClient.WithRateLimiter.Options.tokens` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter.Options.disableResponseInspection`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1030`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Disable automatic limits updates from response headers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClient.WithRateLimiter.Options.disableResponseInspection` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpClient.WithRateLimiter.Options.disableAdaptiveLearning`

- **Source:** `packages/effect/src/unstable/http/HttpClient.ts:1034`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Disable adaptive learning from `Retry-After` responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/http/HttpClient.WithRateLimiter.Options.disableAdaptiveLearning` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

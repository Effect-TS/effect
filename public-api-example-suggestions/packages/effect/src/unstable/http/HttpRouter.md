# Example Suggestions: `effect/unstable/http/HttpRouter`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts`
- **Uncovered API records:** 35
- **Priorities:** 0 required, 14 recommended, 21 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind                    | Priority        |
| ---------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/http/HttpRouter.layer`              |  561 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.toHttpEffect`       |  576 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.cors`               | 1151 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.provideRequest`     | 1193 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.serve`              | 1218 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.toWebHandler`       | 1282 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.HttpRouter (value)` |  103 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.make`               |  118 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.RouteContext`       |  276 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.params`             |  287 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.schemaJson`         |  305 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.schemaNoBody`       |  360 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.schemaParams`       |  411 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.route`              |  665 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpRouter.HttpRouter (type)`  |   47 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.Middleware`         |  831 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.RouterConfig`       |  255 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.schemaPathParams`   |  430 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.Route (type)`       |  607 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.PathInput`          |  695 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.prefixPath`         |  712 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.prefixRoute`        |  734 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.Request (type)`     |  754 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.Provided`           |  801 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.GlobalProvided`     |  813 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpRouter.Route (type)`       |  622 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpRouter.Route.Error`        |  629 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpRouter.Route.Context`      |  637 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpRouter.Request (type)`     |  766 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpRouter.Request.From`       |  773 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpRouter.Request.Only`       |  782 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpRouter.Request.Without`    |  791 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpRouter.middleware`         | 1042 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpRouter.middleware.Make`    | 1055 | `namespace-declaration` | **optional**    |
| `effect/unstable/http/HttpRouter.middleware.Fn`      | 1140 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/unstable/http/HttpRouter.layer`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:561`
- **Kind / category:** `root-declaration` / `HttpRouter`
- **Priority:** **recommended**
- **Current description:** Layer that provides a newly constructed `HttpRouter`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRouter.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.toHttpEffect`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:576`
- **Kind / category:** `root-declaration` / `HttpRouter`
- **Priority:** **recommended**
- **Current description:** Builds an application layer with a router and returns the router as an HTTP handler effect.
- **Signature hint:** `declare function toHttpEffect<A, E, R>(appLayer: Layer.Layer<A, E, R>): Effect.Effect<Effect.Effect<HttpServerResponse.HttpServerResponse, Request.Only<'Error', R> | Request.Only<'GlobalRequires', R> | HttpServerError.HttpServerError, Scope.Scope | HttpServerRequest.HttpServerRequest | Request.Only<'Requires', R> | Request.Only<'GlobalRequires', R>>, Request.Without<E>, Exclude<Request.Without<R>, HttpRouter> | Scope.Scope>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.toHttpEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpRouter.toHttpEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.cors`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:1151`
- **Kind / category:** `root-declaration` / `middleware`
- **Priority:** **recommended**
- **Current description:** Middleware that applies CORS headers to the HTTP response.
- **Signature hint:** `declare function cors(options?: { readonly allowedOrigins?: ReadonlyArray<string> | undefined; readonly allowedMethods?: ReadonlyArray<string> | undefined; readonly allowedHeaders?: ReadonlyArray<string> | undefined; readonly exposedHeaders?: ReadonlyArray<string> | undefined; readonly maxAge?: number | undefined; readonly credentials?: boolean | undefined; } | undefined): Layer.Layer<never, never, HttpRouter>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.cors`.
- **Suggested snippet:** Use the public setup or registry consumed by `HttpRouter.cors`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.provideRequest`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:1193`
- **Kind / category:** `root-declaration` / `middleware`
- **Priority:** **recommended**
- **Current description:** Provides request-level dependencies to some routes.
- **Signature hint:** `declare function provideRequest<A2, E2, R2>(layer: Layer.Layer<A2, E2, R2>): <A, E, R>(self: Layer.Layer<A, E, R>) => Layer.Layer<A, E | E2, R2 | Exclude<R, Request.From<'Requires', A2>>>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.provideRequest`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRouter.provideRequest`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.serve`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:1218`
- **Kind / category:** `root-declaration` / `server`
- **Priority:** **recommended**
- **Current description:** Runs the provided application layer as an HTTP server.
- **Signature hint:** `declare function serve<A, E, R, HE, HR = Request.Only<'Requires', R> | Request.Only<'GlobalRequires', R>>(appLayer: Layer.Layer<A, E, R>, options?: { readonly routerConfig?: Partial<FindMyWay.RouterConfig> | undefined; readonly disableLogger?: boolean | undefined; readonly disableListenLog?: boolean; readonly middleware?: (effect: Effect.Effect<HttpServerResponse.HttpServerResponse, Request.Only<'Error', R> | Request.Only<'GlobalError', R> | HttpServerError.HttpServerError, Scope.Scope | HttpServerRequest.HttpServerRequest | Request.Only<'Requires', R> | Request.Only<'GlobalRequires', R>>) => Effect.Effect<HttpServerResponse.HttpServerResponse, HE, HR>; }): Layer.Layer<A, Request.Without<E>, HttpServer.HttpServer | Exclude<Request.Without<R> | Exclude<HR, GlobalProvided>, HttpRouter>>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.serve`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRouter.serve`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.toWebHandler`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:1282`
- **Kind / category:** `root-declaration` / `server`
- **Priority:** **recommended**
- **Current description:** Builds a Fetch-compatible request handler from an HTTP router application layer.
- **Signature hint:** `declare function toWebHandler<A, E, R extends HttpRouter | Request<'Requires', any> | Request<'GlobalRequires', any> | Request<'Error', any> | Request<'GlobalError', any>, HE, HR = Exclude<Request.Only<'Requires', R>, A> | Exclude<Request.Only<'GlobalRequires', R>, A>, ReqR = Exclude<HR, Scope.Scope | HttpServerRequest.HttpServerRequest | A>>(appLayer: Layer.Layer<A, E, R>, options?: { readonly memoMap?: Layer.MemoMap | undefined; readonly routerConfig?: Partial<FindMyWay.RouterConfig> | undefined; readonly disableLogger?: boolean | undefined; readonly middleware?: (effect: Effect.Effect<HttpServerResponse.HttpServerResponse, Request.Only<'Error', R> | Request.Only<'GlobalError', R> | HttpServerError.HttpServerError, Scope.Scope | HttpServerRequest.HttpServerRequest | Request.Only<'Requires', R> | Request.Only<'GlobalRequires', R>>) => Effect.Effect<HttpServerResponse.HttpServerResponse, HE, HR | GlobalProvided>; }): { readonly handler: [ReqR] extends [never] ? ((request: globalThis.Request, context?: Context.Context<never> | undefined) => Promise<Response>) : ((request: globalThis.Request, context: Context.Context<ReqR>) => Promise<Response>); readonly dispose: () => Promise<void>; }`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.toWebHandler`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpRouter.toWebHandler`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.HttpRouter (value)`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:103`
- **Kind / category:** `root-declaration` / `HttpRouter`
- **Priority:** **recommended**
- **Current description:** Service tag for the HTTP router used while constructing an HTTP application. Route and middleware layers require this service to register themselves with the router.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.HttpRouter`.
- **Suggested snippet:** Consume `HttpRouter.HttpRouter` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.make`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:118`
- **Kind / category:** `root-declaration` / `HttpRouter`
- **Priority:** **recommended**
- **Current description:** Constructs an empty `HttpRouter` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.make`.
- **Suggested snippet:** Construct one representative value with `HttpRouter.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.RouteContext`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:276`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service for the matched HTTP route in the current request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.RouteContext`.
- **Suggested snippet:** Consume `HttpRouter.RouteContext` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.params`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:287`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Effect that returns the path parameters captured for the current matched route.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.params`.
- **Suggested snippet:** Use `HttpRouter.params` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.schemaJson`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:305`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Decodes a schema from the current request and its JSON body.
- **Signature hint:** `declare function schemaJson<A, I extends Partial<{ readonly method: HttpMethod.HttpMethod; readonly url: string; readonly cookies: Readonly<Record<string, string | undefined>>; readonly headers: Readonly<Record<string, string | undefined>>; readonly pathParams: Readonly<Record<string, string | undefined>>; readonly searchParams: Readonly<Record<string, string | ReadonlyArray<string> | undefined>>; readonly body: any; }>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, HttpServerError.HttpServerError | Schema.SchemaError, HttpServerRequest.HttpServerRequest | HttpServerRequest.ParsedSearchParams | RouteContext | RD>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.schemaJson`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpRouter.schemaJson`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.schemaNoBody`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:360`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Decodes a schema from the current request without reading the request body.
- **Signature hint:** `declare function schemaNoBody<A, I extends Partial<{ readonly method: HttpMethod.HttpMethod; readonly url: string; readonly cookies: Readonly<Record<string, string | undefined>>; readonly headers: Readonly<Record<string, string | undefined>>; readonly pathParams: Readonly<Record<string, string | undefined>>; readonly searchParams: Readonly<Record<string, string | ReadonlyArray<string> | undefined>>; }>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, Schema.SchemaError, HttpServerRequest.HttpServerRequest | HttpServerRequest.ParsedSearchParams | RouteContext | RD>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.schemaNoBody`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpRouter.schemaNoBody`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.schemaParams`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:411`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Decodes a schema from the current route path parameters and search parameters.
- **Signature hint:** `declare function schemaParams<A, I extends Readonly<Record<string, string | ReadonlyArray<string> | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, Schema.SchemaError, HttpServerRequest.ParsedSearchParams | RouteContext | RD>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.schemaParams`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpRouter.schemaParams`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpRouter.route`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:665`
- **Kind / category:** `root-declaration` / `Route`
- **Priority:** **recommended**
- **Current description:** Constructs a `Route` from an HTTP method, path, and handler.
- **Signature hint:** `declare function route<E = never, R = never>(method: '*' | HttpMethod.HttpMethod, path: PathInput, handler: HttpServerResponse.HttpServerResponse | Effect.Effect<HttpServerResponse.HttpServerResponse, E, R> | ((request: HttpServerRequest.HttpServerRequest) => Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>), options?: { readonly uninterruptible?: boolean | undefined; }): Route<E, Exclude<R, Provided>>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.route`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a `Route` from an HTTP method, path, and handler. Call `HttpRouter.route` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpRouter.HttpRouter (type)`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:47`
- **Kind / category:** `root-declaration` / `HttpRouter`
- **Priority:** **optional**
- **Current description:** Defines the service interface for registering HTTP routes and middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.HttpRouter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Middleware`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:831`
- **Kind / category:** `root-declaration` / `middleware`
- **Priority:** **optional**
- **Current description:** Composable descriptor for route-scoped HTTP router middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Middleware`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.RouterConfig`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:255`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Context reference for low-level router configuration.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.RouterConfig`.
- **Suggested snippet:** Consume `HttpRouter.RouterConfig` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.schemaPathParams`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:430`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Decodes a schema from the path parameters captured for the current matched route.
- **Signature hint:** `declare function schemaPathParams<A, I extends Readonly<Record<string, string | undefined>>, RD>(schema: Schema.ConstraintCodec<A, I, RD, unknown>, options?: ParseOptions | undefined): Effect.Effect<A, Schema.SchemaError, RouteContext | RD>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.schemaPathParams`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpRouter.schemaPathParams`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Route (type)`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:607`
- **Kind / category:** `root-declaration` / `Route`
- **Priority:** **optional**
- **Current description:** Description of a registered HTTP route.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Route`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.PathInput`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:695`
- **Kind / category:** `root-declaration` / `PathInput`
- **Priority:** **optional**
- **Current description:** Path pattern accepted by the router. Routes must use an absolute path beginning with `/` or the wildcard `*`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.PathInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.prefixPath`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:712`
- **Kind / category:** `root-declaration` / `PathInput`
- **Priority:** **optional**
- **Current description:** Adds a path prefix to a route path.
- **Signature hint:** `declare function prefixPath(prefix: string): (self: string) => string declare function prefixPath(self: string, prefix: string): string`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.prefixPath`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds a path prefix to a route path. Call `HttpRouter.prefixPath` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.prefixRoute`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:734`
- **Kind / category:** `root-declaration` / `Route`
- **Priority:** **optional**
- **Current description:** Returns a copy of a route with its path prefixed.
- **Signature hint:** `declare function prefixRoute(prefix: string): <E, R>(self: Route<E, R>) => Route<E, R> declare function prefixRoute<E, R>(self: Route<E, R>, prefix: string): Route<E, R>`
- **Import guidance:** Start from `import { HttpRouter } from "effect/unstable/http"` and use `HttpRouter.prefixRoute`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a copy of a route with its path prefixed. Call `HttpRouter.prefixRoute` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Request (type)`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:754`
- **Kind / category:** `root-declaration` / `Request types`
- **Priority:** **optional**
- **Current description:** Represents a request-level dependency, that needs to be provided by middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Request`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Provided`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:801`
- **Kind / category:** `root-declaration` / `Request types`
- **Priority:** **optional**
- **Current description:** Services provided by the HTTP router, which are available in the request context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Provided`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.GlobalProvided`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:813`
- **Kind / category:** `root-declaration` / `Request types`
- **Priority:** **optional**
- **Current description:** Services provided to global middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.GlobalProvided`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Route (type)`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:622`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Helper types for extracting the error and context types carried by `Route` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Route`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Route.Error`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:629`
- **Kind / category:** `namespace-declaration` / `Route`
- **Priority:** **optional**
- **Current description:** Extracts the error type produced by a `Route` handler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Route.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Route.Context`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:637`
- **Kind / category:** `namespace-declaration` / `Route`
- **Priority:** **optional**
- **Current description:** Extracts the context requirements of a `Route` handler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Route.Context`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Request (type)`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:766`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Helper types for request-level dependency markers used by router layers and middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Request`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Request.From`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:773`
- **Kind / category:** `namespace-declaration` / `Request types`
- **Priority:** **optional**
- **Current description:** Wraps a type in a request-level marker of the supplied kind.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Request.From`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Request.Only`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:782`
- **Kind / category:** `namespace-declaration` / `Request types`
- **Priority:** **optional**
- **Current description:** Extracts the payload types from request-level markers that have the supplied kind.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Request.Only`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.Request.Without`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:791`
- **Kind / category:** `namespace-declaration` / `Request types`
- **Priority:** **optional**
- **Current description:** Removes request-level markers from a union, leaving only ordinary requirement or error types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.Request.Without`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.middleware`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:1042`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Types used by the `middleware` constructor.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.middleware`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.middleware.Make`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:1055`
- **Kind / category:** `namespace-declaration` / `middleware`
- **Priority:** **optional**
- **Current description:** Overloaded constructor type for router middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.middleware.Make`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpRouter.middleware.Fn`

- **Source:** `packages/effect/src/unstable/http/HttpRouter.ts:1140`
- **Kind / category:** `namespace-declaration` / `middleware`
- **Priority:** **optional**
- **Current description:** Function that transforms an HTTP response effect into another HTTP response effect.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpRouter.middleware.Fn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

# Example Suggestions: `effect/unstable/http/HttpEffect`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts`
- **Uncovered API records:** 12
- **Priorities:** 2 required, 6 recommended, 3 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                              | Line | Kind               | Priority        |
| ---------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpEffect.scopeDisableClose`              |  129 | `root-declaration` | **required**    |
| `effect/unstable/http/HttpEffect.scopeTransferToStream`          |  139 | `root-declaration` | **required**    |
| `effect/unstable/http/HttpEffect.toHandled`                      |   36 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpEffect.toWebHandlerWith`               |  232 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpEffect.toWebHandler`                   |  274 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpEffect.appendPreResponseHandler`       |  189 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpEffect.withPreResponseHandler`         |  212 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpEffect.fromWebHandler`                 |  375 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpEffect.toWebHandlerLayerWith`          |  286 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpEffect.toWebHandlerLayer`              |  348 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpEffect.PreResponseHandler`             |  178 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpEffect.appendPreResponseHandlerUnsafe` |  201 | `root-declaration` | **discouraged** |

## Required

### `effect/unstable/http/HttpEffect.scopeDisableClose`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:129`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Disables automatic closing for an HTTP request scope.
- **Signature hint:** `declare function scopeDisableClose(scope: Scope.Scope): void`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.scopeDisableClose`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Disables automatic closing for an HTTP request scope. Call `HttpEffect.scopeDisableClose` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

### `effect/unstable/http/HttpEffect.scopeTransferToStream`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:139`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Returns a streaming server response that closes the request scope when the body stream exits.
- **Signature hint:** `declare function scopeTransferToStream(response: HttpServerResponse): HttpServerResponse`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.scopeTransferToStream`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a streaming server response that closes the request scope when the body stream exits. Call `HttpEffect.scopeTransferToStream` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/unstable/http/HttpEffect.toHandled`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:36`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Runs an HTTP server effect, sends the produced response with the supplied handler, and converts failures into HTTP responses.
- **Signature hint:** `declare function toHandled<E, R, EH, RH>(self: Effect.Effect<HttpServerResponse, E, R>, handleResponse: (request: HttpServerRequest, response: HttpServerResponse) => Effect.Effect<unknown, EH, RH>, middleware?: HttpMiddleware | undefined): Effect.Effect<void, never, Exclude<R | RH | HttpServerRequest, Scope.Scope>>`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.toHandled`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpEffect.toHandled`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpEffect.toWebHandlerWith`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:232`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts an HTTP server effect into a Web `Request` handler using the supplied base context and optional middleware.
- **Signature hint:** `declare function toWebHandlerWith<Provided, R = never, ReqR = Exclude<R, Scope.Scope | HttpServerRequest | Provided>>(context: Context.Context<Provided>): <E>(self: Effect.Effect<HttpServerResponse, E, R>, middleware?: HttpMiddleware | undefined) => [ReqR] extends [never] ? (request: Request, context?: Context.Context<never> | undefined) => Promise<globalThis.Response> : (request: Request, context: Context.Context<ReqR>) => Promise<globalThis.Response>`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.toWebHandlerWith`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpEffect.toWebHandlerWith`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpEffect.toWebHandler`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:274`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Converts an HTTP server effect into a Web `Request` handler using an empty base context.
- **Signature hint:** `declare function toWebHandler<E>(self: Effect.Effect<HttpServerResponse, E, HttpServerRequest | Scope.Scope>, middleware?: HttpMiddleware | undefined): (request: Request, context?: Context.Context<never> | undefined) => Promise<globalThis.Response>`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.toWebHandler`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpEffect.toWebHandler`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpEffect.appendPreResponseHandler`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:189`
- **Kind / category:** `root-declaration` / `fiber refs`
- **Priority:** **recommended**
- **Current description:** Registers an additional pre-response handler for the current HTTP server request.
- **Signature hint:** `declare function appendPreResponseHandler(handler: PreResponseHandler): Effect.Effect<void, never, HttpServerRequest>`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.appendPreResponseHandler`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpEffect.appendPreResponseHandler`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpEffect.withPreResponseHandler`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:212`
- **Kind / category:** `root-declaration` / `fiber refs`
- **Priority:** **recommended**
- **Current description:** Runs an effect after registering a pre-response handler for the current HTTP server request.
- **Signature hint:** `declare function withPreResponseHandler(handler: PreResponseHandler): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | HttpServerRequest> declare function withPreResponseHandler<A, E, R>(self: Effect.Effect<A, E, R>, handler: PreResponseHandler): Effect.Effect<A, E, R | HttpServerRequest>`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.withPreResponseHandler`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpEffect.withPreResponseHandler`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpEffect.fromWebHandler`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:375`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **recommended**
- **Current description:** Adapts a Web `Request` handler into an HTTP server effect for the current `HttpServerRequest`.
- **Signature hint:** `declare function fromWebHandler(handler: (request: Request) => Promise<Response>): Effect.Effect<HttpServerResponse, HttpServerError, HttpServerRequest>`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.fromWebHandler`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpEffect.fromWebHandler`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpEffect.toWebHandlerLayerWith`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:286`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Builds a Web `Request` handler from a layer and handler factory, returning the handler with a `dispose` function for the layer scope.
- **Signature hint:** `declare function toWebHandlerLayerWith<E, Provided, LE, R, ReqR = Exclude<R, Scope.Scope | HttpServerRequest | Provided>>(layer: Layer.Layer<Provided, LE>, options: { readonly toHandler: (context: Context.Context<Provided>) => Effect.Effect<Effect.Effect<HttpServerResponse, E, R>, LE>; readonly middleware?: HttpMiddleware | undefined; readonly memoMap?: Layer.MemoMap | undefined; }): { readonly dispose: () => Promise<void>; readonly handler: [ReqR] extends [never] ? (request: Request, context?: Context.Context<never> | undefined) => Promise<globalThis.Response> : (request: Request, context: Context.Context<ReqR>) => Promise<globalThis.Response>; }`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.toWebHandlerLayerWith`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpEffect.toWebHandlerLayerWith`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpEffect.toWebHandlerLayer`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:348`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Builds a Web `Request` handler for an HTTP server effect using a layer to provide its services, returning the handler with a `dispose` function.
- **Signature hint:** `declare function toWebHandlerLayer<E, R, Provided, LE, ReqR = Exclude<R, Scope.Scope | HttpServerRequest | Provided>>(self: Effect.Effect<HttpServerResponse, E, R>, layer: Layer.Layer<Provided, LE>, options?: { readonly middleware?: HttpMiddleware | undefined; readonly memoMap?: Layer.MemoMap | undefined; } | undefined): { readonly dispose: () => Promise<void>; readonly handler: [ReqR] extends [never] ? (request: Request, context?: Context.Context<never> | undefined) => Promise<globalThis.Response> : (request: Request, context: Context.Context<ReqR>) => Promise<globalThis.Response>; }`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.toWebHandlerLayer`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpEffect.toWebHandlerLayer`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpEffect.PreResponseHandler`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:178`
- **Kind / category:** `root-declaration` / `Pre-response handlers`
- **Priority:** **optional**
- **Current description:** Function run with the current request and response just before the response is sent, allowing the response to be replaced or failing with `HttpServerError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpEffect.PreResponseHandler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/http/HttpEffect.appendPreResponseHandlerUnsafe`

- **Source:** `packages/effect/src/unstable/http/HttpEffect.ts:201`
- **Kind / category:** `root-declaration` / `fiber refs`
- **Priority:** **discouraged**
- **Current description:** Registers a pre-response handler for the supplied HTTP server request.
- **Signature hint:** `declare function appendPreResponseHandlerUnsafe(request: HttpServerRequest, handler: PreResponseHandler): void`
- **Import guidance:** Start from `import { HttpEffect } from "effect/unstable/http"` and use `HttpEffect.appendPreResponseHandlerUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `HttpEffect.appendPreResponseHandlerUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

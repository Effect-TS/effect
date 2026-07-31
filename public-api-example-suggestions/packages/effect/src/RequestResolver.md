# Example Suggestions: `effect/RequestResolver`

- **Package:** `effect`
- **Source:** `packages/effect/src/RequestResolver.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 5 recommended, 6 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                   | Line | Kind                    | Priority        |
| ----------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/RequestResolver.persisted`                    | 1214 | `root-declaration`      | **recommended** |
| `effect/RequestResolver.isRequestResolver`            |  154 | `root-declaration`      | **recommended** |
| `effect/RequestResolver.makeWith`                     |  184 | `root-declaration`      | **recommended** |
| `effect/RequestResolver.asCache`                      | 1042 | `root-declaration`      | **recommended** |
| `effect/RequestResolver.withCache`                    | 1126 | `root-declaration`      | **recommended** |
| `effect/RequestResolver.never`                        |  733 | `root-declaration`      | **optional**    |
| `effect/RequestResolver.RequestResolver.batchKey`     |   86 | `member`                | **optional**    |
| `effect/RequestResolver.RequestResolver.preCheck`     |   93 | `member`                | **optional**    |
| `effect/RequestResolver.RequestResolver.collectWhile` |   99 | `member`                | **optional**    |
| `effect/RequestResolver.RequestResolver.runAll`       |  104 | `member`                | **optional**    |
| `effect/RequestResolver.RequestResolver`              |  112 | `namespace`             | **optional**    |
| `effect/RequestResolver.RequestResolver.Variance`     |  124 | `namespace-declaration` | **discouraged** |

## Recommended

### `effect/RequestResolver.persisted`

- **Source:** `packages/effect/src/RequestResolver.ts:1214`
- **Kind / category:** `root-declaration` / `Persistence`
- **Priority:** **recommended**
- **Current description:** Wraps a request resolver with persistent storage for persistable requests.
- **Signature hint:** `declare function persisted<A extends Request.Request<any, Persistence.PersistenceError | Schema.SchemaError, any> & Persistable.Any>(options: { readonly storeId: string; readonly timeToLive?: ((exit: Request.Result<A>, request: A) => Duration.Input) | undefined; readonly staleWhileRevalidate?: ((exit: Request.Result<A>, request: A) => boolean) | undefined; }): (self: RequestResolver<A>) => Effect.Effect<RequestResolver<A>, never, Persistence.Persistence | Scope> declare function persisted<A extends Request.Request<any, Persistence.PersistenceError | Schema.SchemaError, any> & Persistable.Any>(self: RequestResolver<A>, options: { readonly storeId: string; readonly timeToLive?: ((exit: Request.Result<A>, request: A) => Duration.Input) | undefined; readonly staleWhileRevalidate?: ((exit: Request.Result<A>, request: A) => boolean) | undefined; }): Effect.Effect<RequestResolver<A>, never, Persistence.Persistence | Scope>`
- **Import guidance:** Start from `import { RequestResolver } from "effect"` and use `RequestResolver.persisted`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RequestResolver.persisted`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/RequestResolver.isRequestResolver`

- **Source:** `packages/effect/src/RequestResolver.ts:154`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if the specified value is a `RequestResolver`, `false` otherwise.
- **Signature hint:** `declare function isRequestResolver(u: unknown): u is RequestResolver<any>`
- **Import guidance:** Start from `import { RequestResolver } from "effect"` and use `RequestResolver.isRequestResolver`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `RequestResolver.isRequestResolver` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/RequestResolver.makeWith`

- **Source:** `packages/effect/src/RequestResolver.ts:184`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a request resolver with fine-grained control over its behavior.
- **Signature hint:** `declare function makeWith<A extends Request.Any>(options: { readonly batchKey: (request: Request.Entry<A>) => unknown; readonly preCheck?: ((entry: Request.Entry<A>) => boolean) | undefined; readonly delay: Effect.Effect<void>; readonly collectWhile: (requests: ReadonlySet<Request.Entry<A>>) => boolean; readonly runAll: (entries: NonEmptyArray<Request.Entry<A>>, key: unknown) => Effect.Effect<void, Request.Error<A>>; }): RequestResolver<A>`
- **Import guidance:** Start from `import { RequestResolver } from "effect"` and use `RequestResolver.makeWith`.
- **Suggested snippet:** Construct one representative value with `RequestResolver.makeWith`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/RequestResolver.asCache`

- **Source:** `packages/effect/src/RequestResolver.ts:1042`
- **Kind / category:** `root-declaration` / `caching`
- **Priority:** **recommended**
- **Current description:** Wraps a request resolver in a cache, allowing it to cache results up to a specified capacity and optional time-to-live.
- **Signature hint:** `declare function asCache<A extends Request.Any, ServiceMode extends 'lookup' | 'construction' = never>(options: { readonly capacity: number; readonly timeToLive?: ((exit: Request.Result<A>, request: A) => Duration.Input) | undefined; readonly requireServicesAt?: ServiceMode | undefined; }): (self: RequestResolver<A>) => Effect.Effect<Cache.Cache<A, Request.Success<A>, Request.Error<A>, 'construction' extends ServiceMode ? never : Request.Services<A>>, never, 'construction' extends ServiceMode ? Request.Services<A> : never> declare function asCache<A extends Request.Any, ServiceMode extends 'lookup' | 'construction' = never>(self: RequestResolver<A>, options: { readonly capacity: number; readonly timeToLive?: ((exit: Request.Result<A>, request: A) => Duration.Input) | undefined; readonly requireServicesAt?: ServiceMode | undefined; }): Effect.Effect<Cache.Cache<A, Request.Success<A>, Request.Error<A>, 'construction' extends ServiceMode ? never : Request.Services<A>>, never, 'construction' extends ServiceMode ? Request.Services<A> : never>`
- **Import guidance:** Start from `import { RequestResolver } from "effect"` and use `RequestResolver.asCache`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RequestResolver.asCache`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/RequestResolver.withCache`

- **Source:** `packages/effect/src/RequestResolver.ts:1126`
- **Kind / category:** `root-declaration` / `caching`
- **Priority:** **recommended**
- **Current description:** Adds a bounded in-memory cache to a request resolver.
- **Signature hint:** `declare function withCache<A extends Request.Any>(options: { readonly capacity: number; readonly strategy?: 'lru' | 'fifo' | undefined; }): (self: RequestResolver<A>) => Effect.Effect<RequestResolver<A>> declare function withCache<A extends Request.Any>(self: RequestResolver<A>, options: { readonly capacity: number; readonly strategy?: 'lru' | 'fifo' | undefined; }): Effect.Effect<RequestResolver<A>>`
- **Import guidance:** Start from `import { RequestResolver } from "effect"` and use `RequestResolver.withCache`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RequestResolver.withCache`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/RequestResolver.never`

- **Source:** `packages/effect/src/RequestResolver.ts:733`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a request resolver that never executes requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RequestResolver } from "effect"` and use `RequestResolver.never`.
- **Suggested snippet:** Use `RequestResolver.never` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/RequestResolver.RequestResolver.batchKey`

- **Source:** `packages/effect/src/RequestResolver.ts:86`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get a batch key for the given request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/RequestResolver.RequestResolver.batchKey` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/RequestResolver.RequestResolver.preCheck`

- **Source:** `packages/effect/src/RequestResolver.ts:93`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** An optional pre-check function that can be used to filter requests before they are added to a batch. If the function returns `false`, the request will not be processed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/RequestResolver.RequestResolver.preCheck` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/RequestResolver.RequestResolver.collectWhile`

- **Source:** `packages/effect/src/RequestResolver.ts:99`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Should the resolver continue collecting requests? Otherwise, it will immediately execute the collected requests cutting the delay short.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/RequestResolver.RequestResolver.collectWhile` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/RequestResolver.RequestResolver.runAll`

- **Source:** `packages/effect/src/RequestResolver.ts:104`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Execute a collection of requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/RequestResolver.RequestResolver.runAll` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/RequestResolver.RequestResolver`

- **Source:** `packages/effect/src/RequestResolver.ts:112`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level helpers associated with `RequestResolver`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/RequestResolver.RequestResolver`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/RequestResolver.RequestResolver.Variance`

- **Source:** `packages/effect/src/RequestResolver.ts:124`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Variance marker carried by every `RequestResolver`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/RequestResolver.RequestResolver.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

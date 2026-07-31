# Example Suggestions: `effect/unstable/rpc/RpcClient`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts`
- **Uncovered API records:** 18
- **Priorities:** 0 required, 3 recommended, 8 optional, 7 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind                    | Priority        |
| --------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/rpc/RpcClient.makeNoSerialization` |  218 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/RpcClient.make`                |  628 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/RpcClient.withHeaders`         |  824 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/RpcClient.RpcClient (type)`    |   61 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/RpcClient.FromGroup`           |  206 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/RpcClient.CurrentHeaders`      |  813 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/RpcClient.ConnectionHooks`     | 1388 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/RpcClient.RpcClient (type)`    |   69 | `namespace`             | **optional**    |
| `effect/unstable/rpc/RpcClient.RpcClient.From`      |   78 | `namespace-declaration` | **optional**    |
| `effect/unstable/rpc/RpcClient.RpcClient.Flat`      |  143 | `namespace-declaration` | **optional**    |
| `effect/unstable/rpc/RpcClient.Protocol.make`       |  863 | `member`                | **optional**    |
| `effect/unstable/rpc/RpcClient.Protocol`            |  845 | `root-declaration`      | **discouraged** |
| `effect/unstable/rpc/RpcClient.makeProtocolHttp`    |  873 | `root-declaration`      | **discouraged** |
| `effect/unstable/rpc/RpcClient.layerProtocolHttp`   |  986 | `root-declaration`      | **discouraged** |
| `effect/unstable/rpc/RpcClient.makeProtocolSocket`  | 1008 | `root-declaration`      | **discouraged** |
| `effect/unstable/rpc/RpcClient.layerProtocolSocket` | 1177 | `root-declaration`      | **discouraged** |
| `effect/unstable/rpc/RpcClient.makeProtocolWorker`  | 1192 | `root-declaration`      | **discouraged** |
| `effect/unstable/rpc/RpcClient.layerProtocolWorker` | 1358 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/unstable/rpc/RpcClient.makeNoSerialization`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:218`
- **Kind / category:** `root-declaration` / `client`
- **Priority:** **recommended**
- **Current description:** Creates an RPC client for an already-decoded message channel, returning the client API together with a `write` function for delivering server messages back to the client.
- **Signature hint:** `declare function makeNoSerialization<Rpcs extends Rpc.Any, E, const Flatten extends boolean = false>(group: RpcGroup.RpcGroup<Rpcs>, options: { readonly onFromClient: (options: { readonly message: FromClient<Rpcs>; readonly context: Context.Context<never>; readonly discard: boolean; }) => Effect.Effect<void, E>; readonly supportsAck?: boolean | undefined; readonly spanPrefix?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly generateRequestId?: (() => RequestId) | undefined; readonly disableTracing?: boolean | undefined; readonly flatten?: Flatten | undefined; }): Effect.Effect<{ readonly client: Flatten extends true ? RpcClient.Flat<Rpcs, E> : RpcClient<Rpcs, E>; readonly write: (message: FromServer<Rpcs>) => Effect.Effect<void>; }, never, Scope.Scope | Rpc.MiddlewareClient<Rpcs>>`
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.makeNoSerialization`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcClient.makeNoSerialization`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcClient.make`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:628`
- **Kind / category:** `root-declaration` / `client`
- **Priority:** **recommended**
- **Current description:** Creates a schema-aware RPC client for a group using the current client `Protocol`, encoding requests and decoding server responses.
- **Signature hint:** `declare function make<Rpcs extends Rpc.Any, const Flatten extends boolean = false>(group: RpcGroup.RpcGroup<Rpcs>, options?: { readonly spanPrefix?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly generateRequestId?: (() => RequestId) | undefined; readonly disableTracing?: boolean | undefined; readonly flatten?: Flatten | undefined; } | undefined): Effect.Effect<Flatten extends true ? RpcClient.Flat<Rpcs, RpcClientError> : RpcClient<Rpcs, RpcClientError>, never, Protocol | Rpc.MiddlewareClient<Rpcs> | Scope.Scope>`
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcClient.withHeaders`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:824`
- **Kind / category:** `root-declaration` / `headers`
- **Priority:** **recommended**
- **Current description:** Runs an effect with additional RPC client headers, merging them with the current `CurrentHeaders` value for outgoing requests.
- **Signature hint:** `declare function withHeaders(headers: Headers.Input): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> declare function withHeaders<A, E, R>(effect: Effect.Effect<A, E, R>, headers: Headers.Input): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.withHeaders`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcClient.withHeaders`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/rpc/RpcClient.RpcClient (type)`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:61`
- **Kind / category:** `root-declaration` / `client`
- **Priority:** **optional**
- **Current description:** The object-shaped client generated from a union of RPC definitions, with one method per RPC tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcClient.RpcClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcClient.FromGroup`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:206`
- **Kind / category:** `root-declaration` / `client`
- **Priority:** **optional**
- **Current description:** Derives the object-shaped RPC client type for all RPCs contained in an `RpcGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcClient.FromGroup`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcClient.CurrentHeaders`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:813`
- **Kind / category:** `root-declaration` / `headers`
- **Priority:** **optional**
- **Current description:** Fiber reference containing headers that are merged into outgoing RPC client requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.CurrentHeaders`.
- **Suggested snippet:** Consume `RpcClient.CurrentHeaders` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcClient.ConnectionHooks`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:1388`
- **Kind / category:** `root-declaration` / `connection hooks`
- **Priority:** **optional**
- **Current description:** Represents optional client protocol hooks that run when a transport connects and disconnects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.ConnectionHooks`.
- **Suggested snippet:** Consume `RpcClient.ConnectionHooks` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcClient.RpcClient (type)`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:69`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Type-level helpers for deriving RPC client call signatures from RPC definitions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcClient.RpcClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcClient.RpcClient.From`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:78`
- **Kind / category:** `namespace-declaration` / `client`
- **Priority:** **optional**
- **Current description:** Builds an object client type from an RPC union, mapping each RPC tag to a method that accepts the RPC payload and returns either an `Effect` or `Stream` based on the RPC success schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcClient.RpcClient.From`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcClient.RpcClient.Flat`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:143`
- **Kind / category:** `namespace-declaration` / `client`
- **Priority:** **optional**
- **Current description:** Builds a flattened RPC client function that accepts an RPC tag and payload, returning the corresponding `Effect` or `Stream` for that RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcClient.RpcClient.Flat`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcClient.Protocol.make`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:863`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a client protocol service from the supplied RPC request runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcClient.Protocol.make` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/rpc/RpcClient.Protocol`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:845`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Defines the service interface for an RPC client transport, responsible for running the receive loop and sending encoded client messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.Protocol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcClient.Protocol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcClient.makeProtocolHttp`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:873`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a client `Protocol` that sends each RPC request through the supplied `HttpClient` and decodes responses with the current `RpcSerialization`.
- **Signature hint:** `declare function makeProtocolHttp(client: HttpClient.HttpClient): Effect.Effect<Protocol['Service'], never, RpcSerialization.RpcSerialization>`
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.makeProtocolHttp`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcClient.makeProtocolHttp` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcClient.layerProtocolHttp`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:986`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Provides a client `Protocol` backed by `HttpClient`, targeting the configured URL and optionally transforming the client before use.
- **Signature hint:** `declare function layerProtocolHttp(options: { readonly url: string; readonly transformClient?: <E, R>(client: HttpClient.HttpClient.With<E, R>) => HttpClient.HttpClient.With<E, R>; }): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization | HttpClient.HttpClient>`
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.layerProtocolHttp`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcClient.layerProtocolHttp` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcClient.makeProtocolSocket`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:1008`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a client `Protocol` over the current `Socket`, using the current `RpcSerialization`, connection hooks, ping timeouts, and the configured retry policy.
- **Signature hint:** `declare function makeProtocolSocket(options?: { readonly retryTransientErrors?: boolean | undefined; readonly retryPolicy?: Schedule.Schedule<any, Socket.SocketError> | undefined; }): Effect.Effect<Protocol['Service'], never, Scope.Scope | RpcSerialization.RpcSerialization | Socket.Socket>`
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.makeProtocolSocket`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcClient.makeProtocolSocket` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcClient.layerProtocolSocket`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:1177`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Provides a client `Protocol` backed by the current `Socket` and `RpcSerialization` services.
- **Signature hint:** `declare function layerProtocolSocket(options?: { readonly retryTransientErrors?: boolean | undefined; }): Layer.Layer<Protocol, never, Socket.Socket | RpcSerialization.RpcSerialization>`
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.layerProtocolSocket`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcClient.layerProtocolSocket` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcClient.makeProtocolWorker`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:1192`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a client `Protocol` backed by a pool of workers, routing RPC requests to workers and supporting transferable values when the platform does.
- **Signature hint:** `declare function makeProtocolWorker(options: { readonly size: number; readonly concurrency?: number | undefined; readonly targetUtilization?: number | undefined; } | { readonly minSize: number; readonly maxSize: number; readonly concurrency?: number | undefined; readonly targetUtilization?: number | undefined; readonly timeToLive: Duration.Input; }): Effect.Effect<Protocol['Service'], WorkerError, Scope.Scope | Worker.WorkerPlatform | Worker.Spawner>`
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.makeProtocolWorker`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcClient.makeProtocolWorker` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcClient.layerProtocolWorker`

- **Source:** `packages/effect/src/unstable/rpc/RpcClient.ts:1358`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Provides a client `Protocol` backed by a worker pool using the current worker platform and spawner services.
- **Signature hint:** `declare function layerProtocolWorker(options: { readonly size: number; readonly concurrency?: number | undefined; readonly targetUtilization?: number | undefined; } | { readonly minSize: number; readonly maxSize: number; readonly concurrency?: number | undefined; readonly targetUtilization?: number | undefined; readonly timeToLive: Duration.Input; }): Layer.Layer<Protocol, WorkerError, Worker.WorkerPlatform | Worker.Spawner>`
- **Import guidance:** Start from `import { RpcClient } from "effect/unstable/rpc"` and use `RpcClient.layerProtocolWorker`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcClient.layerProtocolWorker` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

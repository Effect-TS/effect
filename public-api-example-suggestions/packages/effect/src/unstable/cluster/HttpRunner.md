# Example Suggestions: `effect/unstable/cluster/HttpRunner`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 13 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                      | Line | Kind               | Priority        |
| ------------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/HttpRunner.layerClientProtocolHttp`             |   46 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerClientProtocolHttpDefault`      |   77 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerClientProtocolWebsocket`        |   95 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerClientProtocolWebsocketDefault` |  128 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerClient`                         |  189 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerHttpOptions`                    |  203 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerWebsocketOptions`               |  226 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerHttp`                           |  254 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerHttpClientOnly`                 |  284 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerWebsocket`                      |  307 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.layerWebsocketClientOnly`            |  337 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.toHttpEffect`                        |  145 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/HttpRunner.toHttpEffectWebsocket`               |  169 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/cluster/HttpRunner.layerClientProtocolHttp`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:46`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a runner RPC client protocol that connects to runner addresses over HTTP.
- **Signature hint:** `declare function layerClientProtocolHttp(options: { readonly path: string; readonly https?: boolean | undefined; }): Layer.Layer<RpcClientProtocol, never, RpcSerialization.RpcSerialization | HttpClient.HttpClient>`
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerClientProtocolHttp`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerClientProtocolHttp`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerClientProtocolHttpDefault`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:77`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Default HTTP runner client protocol layer using path `/`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerClientProtocolHttpDefault`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerClientProtocolHttpDefault`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerClientProtocolWebsocket`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:95`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a runner RPC client protocol that connects to runner addresses over WebSocket.
- **Signature hint:** `declare function layerClientProtocolWebsocket(options: { readonly path: string; readonly https?: boolean | undefined; }): Layer.Layer<RpcClientProtocol, never, RpcSerialization.RpcSerialization | Socket.WebSocketConstructor>`
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerClientProtocolWebsocket`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerClientProtocolWebsocket`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerClientProtocolWebsocketDefault`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:128`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Default WebSocket runner client protocol layer using path `/`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerClientProtocolWebsocketDefault`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerClientProtocolWebsocketDefault`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerClient`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:189`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides `Sharding` and `Runners` using the configured runner RPC client protocol and storage services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerClient`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerClient`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerHttpOptions`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:203`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that adds HTTP runner routes to the provided `HttpRouter`.
- **Signature hint:** `declare function layerHttpOptions(options: { readonly path: HttpRouter.PathInput; }): Layer.Layer<Sharding.Sharding | Runners.Runners, never, RunnerStorage | RunnerHealth | RpcSerialization.RpcSerialization | MessageStorage | ShardingConfig.ShardingConfig | Runners.RpcClientProtocol | HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerHttpOptions`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerHttpOptions`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerWebsocketOptions`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:226`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that adds WebSocket runner routes to the provided `HttpRouter`.
- **Signature hint:** `declare function layerWebsocketOptions(options: { readonly path: HttpRouter.PathInput; }): Layer.Layer<Sharding.Sharding | Runners.Runners, never, ShardingConfig.ShardingConfig | Runners.RpcClientProtocol | MessageStorage | RunnerStorage | RunnerHealth | RpcSerialization.RpcSerialization | HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerWebsocketOptions`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerWebsocketOptions`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerHttp`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:254`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that serves runner routes at `/` and configures HTTP runner clients.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerHttp`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerHttp`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerHttpClientOnly`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:284`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a client-only HTTP runner layer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerHttpClientOnly`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerHttpClientOnly`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerWebsocket`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:307`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that serves runner routes at `/` and configures WebSocket runner clients.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerWebsocket`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerWebsocket`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.layerWebsocketClientOnly`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:337`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a client-only WebSocket runner layer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.layerWebsocketClientOnly`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpRunner.layerWebsocketClientOnly`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.toHttpEffect`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:145`
- **Kind / category:** `root-declaration` / `http app`
- **Priority:** **recommended**
- **Current description:** Builds an HTTP effect that serves runner RPCs over the HTTP protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.toHttpEffect`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpRunner.toHttpEffect`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/HttpRunner.toHttpEffectWebsocket`

- **Source:** `packages/effect/src/unstable/cluster/HttpRunner.ts:169`
- **Kind / category:** `root-declaration` / `http app`
- **Priority:** **recommended**
- **Current description:** Builds an HTTP effect that serves runner RPCs over WebSocket.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpRunner } from "effect/unstable/cluster"` and use `HttpRunner.toHttpEffectWebsocket`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `HttpRunner.toHttpEffectWebsocket`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

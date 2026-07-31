# Example Suggestions: `@effect/platform-node/NodeHttpClient`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeHttpClient.ts`
- **Uncovered API records:** 18
- **Priorities:** 0 required, 11 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind               | Priority        |
| -------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeHttpClient.layerFetch`              |   64 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.layerDispatcher`         |  113 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.makeAgent`               |  401 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.layerAgentOptions`       |  421 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.layerAgent`              |  432 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.Dispatcher`              |   89 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.dispatcherLayerGlobal`   |  124 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.makeUndici`              |  146 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.layerUndiciNoDispatcher` |  363 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.HttpAgent`               |  389 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.layerNodeHttpNoAgent`    |  655 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpClient.makeDispatcher`          |  100 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeHttpClient.layerUndici`             |  376 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeHttpClient.layerNodeHttp`           |  668 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeHttpClient.Fetch`                   |   57 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeHttpClient.RequestInit`             |   75 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeHttpClient.UndiciOptions`           |  133 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeHttpClient.makeNodeHttp`            |  442 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-node/NodeHttpClient.layerFetch`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:64`
- **Kind / category:** `root-declaration` / `fetch`
- **Priority:** **recommended**
- **Current description:** Layer that provides the fetch-based HTTP client implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.layerFetch`.
- **Suggested snippet:** Use `NodeHttpClient.layerFetch` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.layerDispatcher`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:113`
- **Kind / category:** `root-declaration` / `Dispatcher`
- **Priority:** **recommended**
- **Current description:** Provides the `Dispatcher` service using a scoped Undici `Agent`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.layerDispatcher`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpClient.layerDispatcher`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.makeAgent`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:401`
- **Kind / category:** `root-declaration` / `HttpAgent`
- **Priority:** **recommended**
- **Current description:** Acquires Node `http` and `https` agents with the supplied options and destroys both agents when the enclosing scope is finalized.
- **Signature hint:** `declare function makeAgent(options?: Https.AgentOptions): Effect.Effect<HttpAgent['Service'], never, Scope.Scope>`
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.makeAgent`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeHttpClient.makeAgent`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.layerAgentOptions`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:421`
- **Kind / category:** `root-declaration` / `HttpAgent`
- **Priority:** **recommended**
- **Current description:** Provides the `HttpAgent` service using scoped Node `http` and `https` agents configured with the supplied options.
- **Signature hint:** `declare function layerAgentOptions(options?: Https.AgentOptions | undefined): Layer.Layer<HttpAgent>`
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.layerAgentOptions`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpClient.layerAgentOptions`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.layerAgent`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:432`
- **Kind / category:** `root-declaration` / `HttpAgent`
- **Priority:** **recommended**
- **Current description:** Provides the `HttpAgent` service using default scoped Node `http` and `https` agents.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.layerAgent`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpClient.layerAgent`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.Dispatcher`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:89`
- **Kind / category:** `root-declaration` / `Dispatcher`
- **Priority:** **recommended**
- **Current description:** Service tag for the Undici `Dispatcher` used by the Undici-backed HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.Dispatcher`.
- **Suggested snippet:** Consume `NodeHttpClient.Dispatcher` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.dispatcherLayerGlobal`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:124`
- **Kind / category:** `root-declaration` / `Dispatcher`
- **Priority:** **recommended**
- **Current description:** Provides the `Dispatcher` service from Undici's process-global dispatcher, without creating or owning a new agent.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.dispatcherLayerGlobal`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpClient.dispatcherLayerGlobal`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.makeUndici`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:146`
- **Kind / category:** `root-declaration` / `Undici`
- **Priority:** **recommended**
- **Current description:** Creates an `HttpClient` that sends requests through the current Undici `Dispatcher`, converts Effect HTTP bodies to Undici bodies, and maps transport and decode failures to `HttpClientError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.makeUndici`.
- **Suggested snippet:** Construct one representative value with `NodeHttpClient.makeUndici`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.layerUndiciNoDispatcher`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:363`
- **Kind / category:** `root-declaration` / `Undici`
- **Priority:** **recommended**
- **Current description:** Provides an Undici-backed `HttpClient` using the current `Dispatcher` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.layerUndiciNoDispatcher`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpClient.layerUndiciNoDispatcher`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.HttpAgent`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:389`
- **Kind / category:** `root-declaration` / `HttpAgent`
- **Priority:** **recommended**
- **Current description:** Service tag for the paired Node `http` and `https` agents used by the node:http-backed HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.HttpAgent`.
- **Suggested snippet:** Consume `NodeHttpClient.HttpAgent` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpClient.layerNodeHttpNoAgent`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:655`
- **Kind / category:** `root-declaration` / `node:http`
- **Priority:** **recommended**
- **Current description:** Provides a node:http-backed `HttpClient` using the current `HttpAgent` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.layerNodeHttpNoAgent`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpClient.layerNodeHttpNoAgent`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-node/NodeHttpClient.makeDispatcher`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:100`
- **Kind / category:** `root-declaration` / `Dispatcher`
- **Priority:** **optional**
- **Current description:** Acquires a new Undici `Agent` dispatcher and destroys it when the enclosing scope is finalized.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.makeDispatcher`.
- **Suggested snippet:** Construct one representative value with `NodeHttpClient.makeDispatcher`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpClient.layerUndici`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:376`
- **Kind / category:** `root-declaration` / `Undici`
- **Priority:** **optional**
- **Current description:** Provides an Undici-backed `HttpClient` together with a scoped default Undici `Agent` dispatcher.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.layerUndici`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpClient.layerUndici`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpClient.layerNodeHttp`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:668`
- **Kind / category:** `root-declaration` / `node:http`
- **Priority:** **optional**
- **Current description:** Provides a node:http-backed `HttpClient` together with default scoped Node `http` and `https` agents.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.layerNodeHttp`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpClient.layerNodeHttp`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpClient.Fetch`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:57`
- **Kind / category:** `root-declaration` / `fetch`
- **Priority:** **optional**
- **Current description:** Provides a fetch-based HTTP client implementation for Node.js.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.Fetch`.
- **Suggested snippet:** Use `NodeHttpClient.Fetch` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpClient.RequestInit`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:75`
- **Kind / category:** `root-declaration` / `fetch`
- **Priority:** **optional**
- **Current description:** Provides request initialization options accepted by the fetch-based HTTP client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.RequestInit`.
- **Suggested snippet:** Use `NodeHttpClient.RequestInit` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpClient.UndiciOptions`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:133`
- **Kind / category:** `root-declaration` / `Undici`
- **Priority:** **optional**
- **Current description:** Fiber reference containing default Undici request options applied to requests sent by `makeUndici`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.UndiciOptions`.
- **Suggested snippet:** Consume `NodeHttpClient.UndiciOptions` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpClient.makeNodeHttp`

- **Source:** `packages/platform-node/src/NodeHttpClient.ts:442`
- **Kind / category:** `root-declaration` / `node:http`
- **Priority:** **optional**
- **Current description:** Creates an `HttpClient` backed by Node `http` and `https`, using the current `HttpAgent`, streaming request bodies, and wrapping Node responses as `HttpClientResponse` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpClient } from "@effect/platform-node"` and use `NodeHttpClient.makeNodeHttp`.
- **Suggested snippet:** Construct one representative value with `NodeHttpClient.makeNodeHttp`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

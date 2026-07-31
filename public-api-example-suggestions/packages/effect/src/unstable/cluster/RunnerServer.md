# Example Suggestions: `effect/unstable/cluster/RunnerServer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/RunnerServer.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 4 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind               | Priority        |
| ------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/RunnerServer.layerHandlers`    |   61 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerServer.layer`            |  197 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerServer.layerWithClients` |  214 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerServer.layerClientOnly`  |  239 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/cluster/RunnerServer.layerHandlers`

- **Source:** `packages/effect/src/unstable/cluster/RunnerServer.ts:61`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that handles runner protocol RPCs by forwarding requests to `Sharding` and `MessageStorage`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerServer } from "effect/unstable/cluster"` and use `RunnerServer.layerHandlers`.
- **Suggested snippet:** Use `RunnerServer.layerHandlers` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/RunnerServer.layer`

- **Source:** `packages/effect/src/unstable/cluster/RunnerServer.ts:197`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates the runner RPC server layer, which receives messages from other runners, forwards them to the `Sharding` layer, and responds to `Ping` requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerServer } from "effect/unstable/cluster"` and use `RunnerServer.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RunnerServer.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/RunnerServer.layerWithClients`

- **Source:** `packages/effect/src/unstable/cluster/RunnerServer.ts:214`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides `RunnerServer` together with `Runners` and `Sharding` clients.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerServer } from "effect/unstable/cluster"` and use `RunnerServer.layerWithClients`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RunnerServer.layerWithClients`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/RunnerServer.layerClientOnly`

- **Source:** `packages/effect/src/unstable/cluster/RunnerServer.ts:239`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a client-only `Runners` layer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerServer } from "effect/unstable/cluster"` and use `RunnerServer.layerClientOnly`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RunnerServer.layerClientOnly`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

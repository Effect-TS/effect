# Example Suggestions: `effect/unstable/cluster/SocketRunner`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/SocketRunner.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind               | Priority        |
| ------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/SocketRunner.layer`           |   65 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/SocketRunner.layerClientOnly` |   92 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/cluster/SocketRunner.layer`

- **Source:** `packages/effect/src/unstable/cluster/SocketRunner.ts:65`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that runs a cluster runner over the socket RPC protocol, providing `Sharding` and `Runners` clients and logging the socket listen address.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SocketRunner } from "effect/unstable/cluster"` and use `SocketRunner.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SocketRunner.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/SocketRunner.layerClientOnly`

- **Source:** `packages/effect/src/unstable/cluster/SocketRunner.ts:92`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a client-only socket runner layer that provides `Sharding` and `Runners` clients without starting a runner server or receiving shard assignments.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SocketRunner } from "effect/unstable/cluster"` and use `SocketRunner.layerClientOnly`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SocketRunner.layerClientOnly`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

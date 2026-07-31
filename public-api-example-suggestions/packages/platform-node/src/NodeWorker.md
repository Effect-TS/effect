# Example Suggestions: `@effect/platform-node/NodeWorker`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeWorker.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeWorker.layer`         |  115 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeWorker.layerPlatform` |   31 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node/NodeWorker.layer`

- **Source:** `packages/platform-node/src/NodeWorker.ts:115`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the Node `WorkerPlatform` together with a `Worker.Spawner` created from the supplied worker or child-process spawning function.
- **Signature hint:** `declare function layer(spawn: (id: number) => WorkerThreads.Worker | ChildProcess.ChildProcess): Layer.Layer<Worker.WorkerPlatform | Worker.Spawner>`
- **Import guidance:** Start from `import { NodeWorker } from "@effect/platform-node"` and use `NodeWorker.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeWorker.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeWorker.layerPlatform`

- **Source:** `packages/platform-node/src/NodeWorker.ts:31`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the Node `WorkerPlatform` for `worker_threads` workers and child process workers, wiring messages, errors, and exits into Effect workers and terminating the worker if graceful shutdown times out.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeWorker } from "@effect/platform-node"` and use `NodeWorker.layerPlatform`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeWorker.layerPlatform`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

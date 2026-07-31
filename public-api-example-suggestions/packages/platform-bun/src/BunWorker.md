# Example Suggestions: `@effect/platform-bun/BunWorker`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunWorker.ts`
- **Uncovered API records:** 2
- **Priorities:** 1 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                            | Line | Kind               | Priority        |
| ---------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunWorker.layerPlatform` |   44 | `root-declaration` | **required**    |
| `@effect/platform-bun/BunWorker.layer`         |   28 | `root-declaration` | **recommended** |

## Required

### `@effect/platform-bun/BunWorker.layerPlatform`

- **Source:** `packages/platform-bun/src/BunWorker.ts:44`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **required**
- **Current description:** Provides the Bun `WorkerPlatform`, wiring worker messages and errors into Effect workers and requesting graceful worker shutdown during scope finalization before terminating on timeout.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunWorker } from "@effect/platform-bun"` and use `BunWorker.layerPlatform`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunWorker.layerPlatform`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `@effect/platform-bun/BunWorker.layer`

- **Source:** `packages/platform-bun/src/BunWorker.ts:28`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the Bun `WorkerPlatform` together with a `Worker.Spawner` created from the supplied worker spawning function.
- **Signature hint:** `declare function layer(spawn: (id: number) => globalThis.Worker): Layer.Layer<Worker.WorkerPlatform | Worker.Spawner>`
- **Import guidance:** Start from `import { BunWorker } from "@effect/platform-bun"` and use `BunWorker.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunWorker.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

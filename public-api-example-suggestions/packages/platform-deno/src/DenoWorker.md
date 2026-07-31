# Example Suggestions: `@effect/platform-deno/DenoWorker`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoWorker.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                              | Line | Kind               | Priority        |
| ------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoWorker.layer`         |   19 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoWorker.layerPlatform` |   33 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-deno/DenoWorker.layer`

- **Source:** `packages/platform-deno/src/DenoWorker.ts:19`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates Deno worker layers by combining the default worker platform with a spawner.
- **Signature hint:** `declare function layer(spawn: (id: number) => globalThis.Worker | MessagePort): Layer.Layer<Worker.WorkerPlatform | Worker.Spawner>`
- **Import guidance:** Start from `import { DenoWorker } from "@effect/platform-deno"` and use `DenoWorker.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoWorker.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoWorker.layerPlatform`

- **Source:** `packages/platform-deno/src/DenoWorker.ts:33`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the Deno worker platform.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoWorker } from "@effect/platform-deno"` and use `DenoWorker.layerPlatform`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoWorker.layerPlatform`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

# Example Suggestions: `@effect/platform-browser/BrowserWorker`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/BrowserWorker.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind               | Priority        |
| ------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-browser/BrowserWorker.layer`         |   41 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserWorker.layerPlatform` |   55 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-browser/BrowserWorker.layer`

- **Source:** `packages/platform-browser/src/BrowserWorker.ts:41`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates browser worker layers by combining the default `WorkerPlatform` with a spawner for `Worker`, `SharedWorker`, or `MessagePort` instances.
- **Signature hint:** `declare function layer(spawn: (id: number) => Worker | SharedWorker | MessagePort): Layer.Layer<Worker.WorkerPlatform | Worker.Spawner>`
- **Import guidance:** Start from `import { BrowserWorker } from "@effect/platform-browser"` and use `BrowserWorker.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserWorker.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserWorker.layerPlatform`

- **Source:** `packages/platform-browser/src/BrowserWorker.ts:55`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the browser `WorkerPlatform` for `Worker`, `SharedWorker`, and `MessagePort` communication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserWorker } from "@effect/platform-browser"` and use `BrowserWorker.layerPlatform`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserWorker.layerPlatform`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

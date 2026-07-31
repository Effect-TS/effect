# Example Suggestions: `@effect/platform-browser/BrowserWorkerRunner`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/BrowserWorkerRunner.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-browser/BrowserWorkerRunner.layer`            |  189 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserWorkerRunner.layerMessagePort` |  199 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserWorkerRunner.make`             |   38 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-browser/BrowserWorkerRunner.layer`

- **Source:** `packages/platform-browser/src/BrowserWorkerRunner.ts:189`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides a browser `WorkerRunnerPlatform` using the global `self` worker context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserWorkerRunner } from "@effect/platform-browser"` and use `BrowserWorkerRunner.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserWorkerRunner.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserWorkerRunner.layerMessagePort`

- **Source:** `packages/platform-browser/src/BrowserWorkerRunner.ts:199`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides a `WorkerRunnerPlatform` using the supplied `MessagePort` or `Window`.
- **Signature hint:** `declare function layerMessagePort(port: MessagePort | Window): Layer.Layer<WorkerRunner.WorkerRunnerPlatform>`
- **Import guidance:** Start from `import { BrowserWorkerRunner } from "@effect/platform-browser"` and use `BrowserWorkerRunner.layerMessagePort`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserWorkerRunner.layerMessagePort`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserWorkerRunner.make`

- **Source:** `packages/platform-browser/src/BrowserWorkerRunner.ts:38`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `WorkerRunnerPlatform` service that runs worker handlers over a `MessagePort` or `Window`.
- **Signature hint:** `declare function make(self: MessagePort | Window): WorkerRunner.WorkerRunnerPlatform['Service']`
- **Import guidance:** Start from `import { BrowserWorkerRunner } from "@effect/platform-browser"` and use `BrowserWorkerRunner.make`.
- **Suggested snippet:** Construct one representative value with `BrowserWorkerRunner.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

# Example Suggestions: `@effect/platform-deno/DenoWorkerRunner`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoWorkerRunner.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoWorkerRunner.layer`            |  164 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoWorkerRunner.layerMessagePort` |  174 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoWorkerRunner.make`             |   32 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-deno/DenoWorkerRunner.layer`

- **Source:** `packages/platform-deno/src/DenoWorkerRunner.ts:164`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the worker runner platform using the global worker scope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoWorkerRunner } from "@effect/platform-deno"` and use `DenoWorkerRunner.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoWorkerRunner.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoWorkerRunner.layerMessagePort`

- **Source:** `packages/platform-deno/src/DenoWorkerRunner.ts:174`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the worker runner platform using the supplied `MessagePort`.
- **Signature hint:** `declare function layerMessagePort(port: MessagePort): Layer.Layer<WorkerRunner.WorkerRunnerPlatform>`
- **Import guidance:** Start from `import { DenoWorkerRunner } from "@effect/platform-deno"` and use `DenoWorkerRunner.layerMessagePort`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoWorkerRunner.layerMessagePort`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoWorkerRunner.make`

- **Source:** `packages/platform-deno/src/DenoWorkerRunner.ts:32`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a worker runner platform over a `MessagePort`.
- **Signature hint:** `declare function make(self: MessagePort): WorkerRunner.WorkerRunnerPlatform['Service']`
- **Import guidance:** Start from `import { DenoWorkerRunner } from "@effect/platform-deno"` and use `DenoWorkerRunner.make`.
- **Suggested snippet:** Construct one representative value with `DenoWorkerRunner.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

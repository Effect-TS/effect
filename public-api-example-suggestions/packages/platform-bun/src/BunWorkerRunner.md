# Example Suggestions: `@effect/platform-bun/BunWorkerRunner`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunWorkerRunner.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                          | Line | Kind               | Priority        |
| -------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunWorkerRunner.layer` |   33 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-bun/BunWorkerRunner.layer`

- **Source:** `packages/platform-bun/src/BunWorkerRunner.ts:33`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the `WorkerRunnerPlatform` for code running inside a Bun worker, routing parent messages to the registered handler and sending responses back through the worker port.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunWorkerRunner } from "@effect/platform-bun"` and use `BunWorkerRunner.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunWorkerRunner.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

# Example Suggestions: `@effect/platform-node-shared/NodeChildProcessSpawner`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeChildProcessSpawner.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 1 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                      | Line | Kind               | Priority        |
| ------------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeChildProcessSpawner.layer`             |  656 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeChildProcessSpawner.flattenCommand`    |  684 | `root-declaration` | **optional**    |
| `@effect/platform-node-shared/NodeChildProcessSpawner.FlattenedPipeline` |  672 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-node-shared/NodeChildProcessSpawner.layer`

- **Source:** `packages/platform-node-shared/src/NodeChildProcessSpawner.ts:656`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the `NodeChildProcessSpawner` implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeChildProcessSpawner } from "@effect/platform-node-shared"` and use `NodeChildProcessSpawner.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeChildProcessSpawner.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-node-shared/NodeChildProcessSpawner.flattenCommand`

- **Source:** `packages/platform-node-shared/src/NodeChildProcessSpawner.ts:684`
- **Kind / category:** `root-declaration` / `transforming`
- **Priority:** **optional**
- **Current description:** Flattens a `Command` into an array of `StandardCommand`s along with pipe options for each connection.
- **Signature hint:** `declare function flattenCommand(command: ChildProcess.Command): FlattenedPipeline`
- **Import guidance:** Start from `import { NodeChildProcessSpawner } from "@effect/platform-node-shared"` and use `NodeChildProcessSpawner.flattenCommand`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Flattens a `Command` into an array of `StandardCommand`s along with pipe options for each connection. Call `NodeChildProcessSpawner.flattenCommand` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node-shared/NodeChildProcessSpawner.FlattenedPipeline`

- **Source:** `packages/platform-node-shared/src/NodeChildProcessSpawner.ts:672`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Result of flattening a pipeline of commands.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-node-shared/NodeChildProcessSpawner.FlattenedPipeline`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

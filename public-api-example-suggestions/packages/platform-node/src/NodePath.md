# Example Suggestions: `@effect/platform-node/NodePath`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodePath.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                         | Line | Kind               | Priority        |
| ------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodePath.layer`      |   22 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodePath.layerPosix` |   31 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodePath.layerWin32` |   40 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node/NodePath.layer`

- **Source:** `packages/platform-node/src/NodePath.ts:22`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the default Node `Path` service using the platform's `node:path` implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodePath } from "@effect/platform-node"` and use `NodePath.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodePath.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodePath.layerPosix`

- **Source:** `packages/platform-node/src/NodePath.ts:31`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the `Path` service using Node's POSIX path implementation, regardless of the host platform.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodePath } from "@effect/platform-node"` and use `NodePath.layerPosix`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodePath.layerPosix`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodePath.layerWin32`

- **Source:** `packages/platform-node/src/NodePath.ts:40`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the `Path` service using Node's Windows path implementation, regardless of the host platform.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodePath } from "@effect/platform-node"` and use `NodePath.layerWin32`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodePath.layerWin32`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

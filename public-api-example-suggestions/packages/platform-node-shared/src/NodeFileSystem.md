# Example Suggestions: `@effect/platform-node-shared/NodeFileSystem`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeFileSystem.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeFileSystem.layer` |  672 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node-shared/NodeFileSystem.layer`

- **Source:** `packages/platform-node-shared/src/NodeFileSystem.ts:672`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the `FileSystem` service backed by Node filesystem APIs, including file operations, directory operations, links, metadata, and file watching.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeFileSystem } from "@effect/platform-node-shared"` and use `NodeFileSystem.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeFileSystem.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

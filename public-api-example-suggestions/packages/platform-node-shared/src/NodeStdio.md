# Example Suggestions: `@effect/platform-node-shared/NodeStdio`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeStdio.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                            | Line | Kind               | Priority        |
| ---------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeStdio.layer` |   27 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node-shared/NodeStdio.layer`

- **Source:** `packages/platform-node-shared/src/NodeStdio.ts:27`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides `Stdio` from `process.argv`, `process.stdin`, `process.stdout`, and `process.stderr`; stdin remains open and stdout/stderr are not ended by default.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeStdio } from "@effect/platform-node-shared"` and use `NodeStdio.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeStdio.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

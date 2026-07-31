# Example Suggestions: `@effect/platform-node/NodeCrypto`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeCrypto.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind               | Priority        |
| ---------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeCrypto.layer` |   24 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node/NodeCrypto.layer`

- **Source:** `packages/platform-node/src/NodeCrypto.ts:24`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the Node.js Crypto service implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeCrypto } from "@effect/platform-node"` and use `NodeCrypto.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeCrypto.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

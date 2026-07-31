# Example Suggestions: `@effect/platform-node-shared/NodeCrypto`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeCrypto.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                             | Line | Kind               | Priority        |
| ----------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeCrypto.layer` |   60 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeCrypto.make`  |   49 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node-shared/NodeCrypto.layer`

- **Source:** `packages/platform-node-shared/src/NodeCrypto.ts:60`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the Node.js Crypto service implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeCrypto } from "@effect/platform-node-shared"` and use `NodeCrypto.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeCrypto.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeCrypto.make`

- **Source:** `packages/platform-node-shared/src/NodeCrypto.ts:49`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** The default Node.js Crypto service implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeCrypto } from "@effect/platform-node-shared"` and use `NodeCrypto.make`.
- **Suggested snippet:** Construct one representative value with `NodeCrypto.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

# Example Suggestions: `@effect/platform-node/NodeHttpPlatform`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeHttpPlatform.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                            | Line | Kind               | Priority        |
| ---------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeHttpPlatform.layer` |   67 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpPlatform.make`  |   29 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-node/NodeHttpPlatform.layer`

- **Source:** `packages/platform-node/src/NodeHttpPlatform.ts:67`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the Node `HttpPlatform` together with the filesystem and ETag services it needs for file responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpPlatform } from "@effect/platform-node"` and use `NodeHttpPlatform.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpPlatform.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-node/NodeHttpPlatform.make`

- **Source:** `packages/platform-node/src/NodeHttpPlatform.ts:29`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates the Node `HttpPlatform`, serving file responses from Node readable streams and adding MIME type and content-length headers when needed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpPlatform } from "@effect/platform-node"` and use `NodeHttpPlatform.make`.
- **Suggested snippet:** Construct one representative value with `NodeHttpPlatform.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

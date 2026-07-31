# Example Suggestions: `@effect/platform-deno/DenoHttpPlatform`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoHttpPlatform.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                            | Line | Kind               | Priority        |
| ---------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoHttpPlatform.layer` |   77 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoHttpPlatform.make`  |   30 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-deno/DenoHttpPlatform.layer`

- **Source:** `packages/platform-deno/src/DenoHttpPlatform.ts:77`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the Deno `HttpPlatform` together with its filesystem and strong ETag services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoHttpPlatform } from "@effect/platform-deno"` and use `DenoHttpPlatform.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoHttpPlatform.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-deno/DenoHttpPlatform.make`

- **Source:** `packages/platform-deno/src/DenoHttpPlatform.ts:30`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates the Deno `HttpPlatform`, serving file responses from resource-backed readable streams and adding content type and content length headers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoHttpPlatform } from "@effect/platform-deno"` and use `DenoHttpPlatform.make`.
- **Suggested snippet:** Construct one representative value with `DenoHttpPlatform.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

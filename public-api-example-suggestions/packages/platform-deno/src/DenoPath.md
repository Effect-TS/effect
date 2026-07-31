# Example Suggestions: `@effect/platform-deno/DenoPath`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoPath.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                         | Line | Kind               | Priority        |
| ------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoPath.layerPosix` |   61 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoPath.layerWin32` |   76 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoPath.layer`      |   93 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-deno/DenoPath.layerPosix`

- **Source:** `packages/platform-deno/src/DenoPath.ts:61`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** A {@linkplain Layer.Layer | layer} that provides POSIX path operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoPath } from "@effect/platform-deno"` and use `DenoPath.layerPosix`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoPath.layerPosix`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoPath.layerWin32`

- **Source:** `packages/platform-deno/src/DenoPath.ts:76`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** A {@linkplain Layer.Layer | layer} that provides Windows path operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoPath } from "@effect/platform-deno"` and use `DenoPath.layerWin32`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoPath.layerWin32`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoPath.layer`

- **Source:** `packages/platform-deno/src/DenoPath.ts:93`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** A {@linkplain Layer.Layer | layer} that provides OS-agnostic path operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoPath } from "@effect/platform-deno"` and use `DenoPath.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoPath.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

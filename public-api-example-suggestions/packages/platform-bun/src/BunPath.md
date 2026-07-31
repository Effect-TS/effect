# Example Suggestions: `@effect/platform-bun/BunPath`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunPath.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                       | Line | Kind               | Priority        |
| ----------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunPath.layer`      |   21 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunPath.layerPosix` |   29 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunPath.layerWin32` |   37 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-bun/BunPath.layer`

- **Source:** `packages/platform-bun/src/BunPath.ts:21`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the default `Path` service for Bun using the shared Node path implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunPath } from "@effect/platform-bun"` and use `BunPath.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunPath.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunPath.layerPosix`

- **Source:** `packages/platform-bun/src/BunPath.ts:29`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the POSIX `Path` service for Bun using the shared Node path implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunPath } from "@effect/platform-bun"` and use `BunPath.layerPosix`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunPath.layerPosix`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunPath.layerWin32`

- **Source:** `packages/platform-bun/src/BunPath.ts:37`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the Win32 `Path` service for Bun using the shared Node path implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunPath } from "@effect/platform-bun"` and use `BunPath.layerWin32`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunPath.layerWin32`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

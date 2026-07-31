# Example Suggestions: `@effect/platform-deno/DenoServices`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoServices.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                               | Line | Kind               | Priority        |
| ------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoServices.layer`        |   41 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoServices.DenoServices` |   32 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-deno/DenoServices.layer`

- **Source:** `packages/platform-deno/src/DenoServices.ts:41`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the default Deno implementations for child process spawning, crypto, filesystem, path, stdio, and terminal services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoServices } from "@effect/platform-deno"` and use `DenoServices.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoServices.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-deno/DenoServices.DenoServices`

- **Source:** `packages/platform-deno/src/DenoServices.ts:32`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The union of core services provided by the Deno platform layer, including child process spawning, crypto, filesystem, path, stdio, and terminal services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-deno/DenoServices.DenoServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

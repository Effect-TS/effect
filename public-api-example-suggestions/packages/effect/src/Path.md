# Example Suggestions: `effect/Path`

- **Package:** `effect`
- **Source:** `packages/effect/src/Path.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 0 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                  | Line | Kind               | Priority        |
| -------------------- | ---: | ------------------ | --------------- |
| `effect/Path.layer`  |  867 | `root-declaration` | **recommended** |
| `effect/Path.TypeId` |   32 | `root-declaration` | **discouraged** |

## Recommended

### `effect/Path.layer`

- **Source:** `packages/effect/src/Path.ts:867`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the built-in POSIX `Path` implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Path } from "effect"` and use `Path.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Path.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `effect/Path.TypeId`

- **Source:** `packages/effect/src/Path.ts:32`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark implementations of the `Path` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Path } from "effect"` and use `Path.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Path.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

# Example Suggestions: `effect/Stdio`

- **Package:** `effect`
- **Source:** `packages/effect/src/Stdio.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 3 recommended, 1 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                           | Line | Kind               | Priority        |
| ----------------------------- | ---: | ------------------ | --------------- |
| `effect/Stdio.layerTest`      |  133 | `root-declaration` | **recommended** |
| `effect/Stdio.Stdio (value)`  |   88 | `root-declaration` | **recommended** |
| `effect/Stdio.make`           |  109 | `root-declaration` | **recommended** |
| `effect/Stdio.Stdio (type)`   |   63 | `root-declaration` | **optional**    |
| `effect/Stdio.TypeId (type)`  |   31 | `root-declaration` | **discouraged** |
| `effect/Stdio.TypeId (value)` |   44 | `root-declaration` | **discouraged** |

## Recommended

### `effect/Stdio.layerTest`

- **Source:** `packages/effect/src/Stdio.ts:133`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a test layer for `Stdio`.
- **Signature hint:** `declare function layerTest(impl: Partial<Stdio>): Layer.Layer<Stdio>`
- **Import guidance:** Start from `import { Stdio } from "effect"` and use `Stdio.layerTest`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Stdio.layerTest`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stdio.Stdio (value)`

- **Source:** `packages/effect/src/Stdio.ts:88`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for process standard I/O.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Stdio } from "effect"` and use `Stdio.Stdio`.
- **Suggested snippet:** Consume `Stdio.Stdio` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Stdio.make`

- **Source:** `packages/effect/src/Stdio.ts:109`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Stdio` service implementation from the provided fields and attaches the `Stdio` type identifier.
- **Signature hint:** `declare function make(options: Omit<Stdio, TypeId>): Stdio`
- **Import guidance:** Start from `import { Stdio } from "effect"` and use `Stdio.make`.
- **Suggested snippet:** Construct one representative value with `Stdio.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Stdio.Stdio (type)`

- **Source:** `packages/effect/src/Stdio.ts:63`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Defines the service interface for process standard I/O.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Stdio.Stdio`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Stdio.TypeId (type)`

- **Source:** `packages/effect/src/Stdio.ts:31`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** String literal type used as the unique brand for the `Stdio` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Stdio.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Stdio.TypeId (value)`

- **Source:** `packages/effect/src/Stdio.ts:44`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime identifier stored on `Stdio` service implementations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Stdio } from "effect"` and use `Stdio.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Stdio.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

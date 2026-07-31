# Example Suggestions: `effect/Pipeable`

- **Package:** `effect`
- **Source:** `packages/effect/src/Pipeable.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 0 recommended, 3 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                   | Line | Kind               | Priority        |
| ------------------------------------- | ---: | ------------------ | --------------- |
| `effect/Pipeable.Class`               |  625 | `root-declaration` | **optional**    |
| `effect/Pipeable.Mixin`               |  669 | `root-declaration` | **optional**    |
| `effect/Pipeable.PipeableConstructor` |  646 | `root-declaration` | **optional**    |
| `effect/Pipeable.Prototype`           |  607 | `root-declaration` | **discouraged** |

## Optional

### `effect/Pipeable.Class`

- **Source:** `packages/effect/src/Pipeable.ts:625`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Provides a base constructor whose instances implement the standard `Pipeable.pipe` method.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Pipeable } from "effect"` and use `Pipeable.Class`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides a base constructor whose instances implement the standard `Pipeable.pipe` method. Call `Pipeable.Class` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pipeable.Mixin`

- **Source:** `packages/effect/src/Pipeable.ts:669`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Returns a subclass of the provided class that adds the standard `pipe` method.
- **Signature hint:** `declare function Mixin<TBase extends new (...args: ReadonlyArray<any>) => any>(klass: TBase): TBase & PipeableConstructor`
- **Import guidance:** Start from `import { Pipeable } from "effect"` and use `Pipeable.Mixin`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns a subclass of the provided class that adds the standard `pipe` method. Call `Pipeable.Mixin` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Pipeable.PipeableConstructor`

- **Source:** `packages/effect/src/Pipeable.ts:646`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Constructor type for classes whose instances implement `Pipeable`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Pipeable.PipeableConstructor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Pipeable.Prototype`

- **Source:** `packages/effect/src/Pipeable.ts:607`
- **Kind / category:** `root-declaration` / `prototypes`
- **Priority:** **discouraged**
- **Current description:** Reusable prototype that implements `Pipeable.pipe`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Pipeable } from "effect"` and use `Pipeable.Prototype`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Pipeable.Prototype` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

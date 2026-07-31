# Example Suggestions: `effect/NonEmptyIterable`

- **Package:** `effect`
- **Source:** `packages/effect/src/NonEmptyIterable.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 1 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                        | Line | Kind               | Priority        |
| ------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/NonEmptyIterable.NonEmptyIterable` |   50 | `root-declaration` | **optional**    |
| `effect/NonEmptyIterable.nonEmpty`         |   29 | `root-declaration` | **discouraged** |

## Optional

### `effect/NonEmptyIterable.NonEmptyIterable`

- **Source:** `packages/effect/src/NonEmptyIterable.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an iterable that is guaranteed to contain at least one element.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/NonEmptyIterable.NonEmptyIterable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/NonEmptyIterable.nonEmpty`

- **Source:** `packages/effect/src/NonEmptyIterable.ts:29`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the type-level symbol used to brand the `NonEmptyIterable` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NonEmptyIterable } from "effect"` and use `NonEmptyIterable.nonEmpty`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `NonEmptyIterable.nonEmpty` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

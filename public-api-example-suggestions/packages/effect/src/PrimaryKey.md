# Example Suggestions: `effect/PrimaryKey`

- **Package:** `effect`
- **Source:** `packages/effect/src/PrimaryKey.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 1 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                              | Line | Kind               | Priority        |
| -------------------------------- | ---: | ------------------ | --------------- |
| `effect/PrimaryKey.isPrimaryKey` |   87 | `root-declaration` | **optional**    |
| `effect/PrimaryKey.symbol`       |   27 | `root-declaration` | **discouraged** |

## Optional

### `effect/PrimaryKey.isPrimaryKey`

- **Source:** `packages/effect/src/PrimaryKey.ts:87`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Checks whether a value implements the `PrimaryKey` protocol.
- **Signature hint:** `declare function isPrimaryKey(u: unknown): u is PrimaryKey`
- **Import guidance:** Start from `import { PrimaryKey } from "effect"` and use `PrimaryKey.isPrimaryKey`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `PrimaryKey.isPrimaryKey` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/PrimaryKey.symbol`

- **Source:** `packages/effect/src/PrimaryKey.ts:27`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Defines the unique identifier used to identify objects that implement the `PrimaryKey` interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PrimaryKey } from "effect"` and use `PrimaryKey.symbol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `PrimaryKey.symbol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

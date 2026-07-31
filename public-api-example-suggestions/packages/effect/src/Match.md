# Example Suggestions: `effect/Match`

- **Package:** `effect`
- **Source:** `packages/effect/src/Match.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 2 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                   | Line | Kind                    | Priority        |
| ------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/Match.undefined`              | 1458 | `root-declaration`      | **recommended** |
| `effect/Match.null`                   | 1481 | `root-declaration`      | **recommended** |
| `effect/Match.Case`                   |  166 | `root-declaration`      | **optional**    |
| `effect/Match.Types`                  | 2025 | `namespace`             | **optional**    |
| `effect/Match.Types.PatternPrimitive` | 2252 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/Match.undefined`

- **Source:** `packages/effect/src/Match.ts:1458`
- **Kind / category:** `root-declaration` / `predicates`
- **Priority:** **recommended**
- **Current description:** Matches the value `undefined`.
- **Signature hint:** `declare function undefined(a: unknown): a is undefined`
- **Import guidance:** Start from `import { Match } from "effect"` and use `Match.undefined`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Match.undefined` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Match.null`

- **Source:** `packages/effect/src/Match.ts:1481`
- **Kind / category:** `root-declaration` / `predicates`
- **Priority:** **recommended**
- **Current description:** Matches the value `null`.
- **Signature hint:** `declare const _null: { (a: unknown): a is null; } export { _null as null }`
- **Import guidance:** Start from `import { Match } from "effect"` and use `Match.null`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Match.null` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Match.Case`

- **Source:** `packages/effect/src/Match.ts:166`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a single pattern matching case.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Match.Case`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Match.Types`

- **Source:** `packages/effect/src/Match.ts:2025`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** A namespace containing utility types for Match operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Match.Types`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Match.Types.PatternPrimitive`

- **Source:** `packages/effect/src/Match.ts:2252`
- **Kind / category:** `namespace-declaration` / `types`
- **Priority:** **optional**
- **Current description:** Defines primitive patterns that can match simple values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Match.Types.PatternPrimitive`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

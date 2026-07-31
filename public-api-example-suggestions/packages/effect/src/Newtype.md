# Example Suggestions: `effect/Newtype`

- **Package:** `effect`
- **Source:** `packages/effect/src/Newtype.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 0 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                              | Line | Kind                    | Priority     |
| -------------------------------- | ---: | ----------------------- | ------------ |
| `effect/Newtype.Newtype`         |   78 | `namespace`             | **optional** |
| `effect/Newtype.Newtype.Any`     |   92 | `namespace-declaration` | **optional** |
| `effect/Newtype.Newtype.Key`     |  104 | `namespace-declaration` | **optional** |
| `effect/Newtype.Newtype.Carrier` |  116 | `namespace-declaration` | **optional** |

## Optional

### `effect/Newtype.Newtype`

- **Source:** `packages/effect/src/Newtype.ts:78`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing type-level helpers for `Newtype` values, including constraints and utilities for extracting a newtype's key and carrier type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Newtype.Newtype`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Newtype.Newtype.Any`

- **Source:** `packages/effect/src/Newtype.ts:92`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** A type that matches any `Newtype`, useful as a generic constraint: `<N extends Newtype.Any>`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Newtype.Newtype.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Newtype.Newtype.Key`

- **Source:** `packages/effect/src/Newtype.ts:104`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the key literal type from a newtype.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Newtype.Newtype.Key`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Newtype.Newtype.Carrier`

- **Source:** `packages/effect/src/Newtype.ts:116`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Extracts the carrier (underlying) type from a newtype.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Newtype.Newtype.Carrier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

# Example Suggestions: `effect/Types`

- **Package:** `effect`
- **Source:** `packages/effect/src/Types.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 0 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                          | Line | Kind               | Priority     |
| ---------------------------- | ---: | ------------------ | ------------ |
| `effect/Types.Invariant`     |  611 | `namespace`        | **optional** |
| `effect/Types.Covariant`     |  683 | `namespace`        | **optional** |
| `effect/Types.Contravariant` |  758 | `namespace`        | **optional** |
| `effect/Types.VoidIfEmpty`   |  796 | `root-declaration` | **optional** |
| `effect/Types.unassigned`    |  873 | `root-declaration` | **optional** |
| `effect/Types.unhandled`     |  895 | `root-declaration` | **optional** |
| `effect/Types.RequiredKeys`  | 1178 | `root-declaration` | **optional** |

## Optional

### `effect/Types.Invariant`

- **Source:** `packages/effect/src/Types.ts:611`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `Invariant`-related utilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Types.Invariant`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Types.Covariant`

- **Source:** `packages/effect/src/Types.ts:683`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `Covariant`-related utilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Types.Covariant`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Types.Contravariant`

- **Source:** `packages/effect/src/Types.ts:758`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `Contravariant`-related utilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Types.Contravariant`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Types.VoidIfEmpty`

- **Source:** `packages/effect/src/Types.ts:796`
- **Kind / category:** `root-declaration` / `types`
- **Priority:** **optional**
- **Current description:** Conditional type that returns `void` if `S` is an empty object type, otherwise returns `S`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Types.VoidIfEmpty`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Types.unassigned`

- **Source:** `packages/effect/src/Types.ts:873`
- **Kind / category:** `root-declaration` / `types`
- **Priority:** **optional**
- **Current description:** Branded marker interface representing an unassigned type parameter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Types.unassigned`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Types.unhandled`

- **Source:** `packages/effect/src/Types.ts:895`
- **Kind / category:** `root-declaration` / `types`
- **Priority:** **optional**
- **Current description:** Branded marker interface representing an unhandled error type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Types.unhandled`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Types.RequiredKeys`

- **Source:** `packages/effect/src/Types.ts:1178`
- **Kind / category:** `root-declaration` / `types`
- **Priority:** **optional**
- **Current description:** Extracts the required keys from a type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Types.RequiredKeys`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

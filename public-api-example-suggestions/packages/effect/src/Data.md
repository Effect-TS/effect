# Example Suggestions: `effect/Data`

- **Package:** `effect`
- **Source:** `packages/effect/src/Data.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 0 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind                    | Priority     |
| ---------------------------------------- | ---: | ----------------------- | ------------ |
| `effect/Data.TaggedEnum`                 |  177 | `namespace`             | **optional** |
| `effect/Data.TaggedEnum.ConstructorFrom` |  440 | `namespace-declaration` | **optional** |
| `effect/Data.TaggedEnum.GenericMatchers` |  461 | `namespace-declaration` | **optional** |

## Optional

### `effect/Data.TaggedEnum`

- **Source:** `packages/effect/src/Data.ts:177`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace for `TaggedEnum` utility types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Data.TaggedEnum`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Data.TaggedEnum.ConstructorFrom`

- **Source:** `packages/effect/src/Data.ts:440`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Function type that constructs a tagged-union variant from its fields, excluding the keys listed in `Tag`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Data.TaggedEnum.ConstructorFrom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Data.TaggedEnum.GenericMatchers`

- **Source:** `packages/effect/src/Data.ts:461`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-guard and pattern-matching interface for generic tagged enums.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Data.TaggedEnum.GenericMatchers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

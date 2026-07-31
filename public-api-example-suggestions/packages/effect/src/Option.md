# Example Suggestions: `effect/Option`

- **Package:** `effect`
- **Source:** `packages/effect/src/Option.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 0 recommended, 8 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                  | Line | Kind               | Priority     |
| ------------------------------------ | ---: | ------------------ | ------------ |
| `effect/Option.OptionIterator`       |  102 | `root-declaration` | **optional** |
| `effect/Option.Option (type) (type)` |   55 | `root-declaration` | **optional** |
| `effect/Option.None`                 |   75 | `root-declaration` | **optional** |
| `effect/Option.Some`                 |  128 | `root-declaration` | **optional** |
| `effect/Option.OptionUnify`          |  158 | `root-declaration` | **optional** |
| `effect/Option.Option (type) (type)` |  171 | `namespace`        | **optional** |
| `effect/Option.OptionUnifyIgnore`    |  211 | `root-declaration` | **optional** |
| `effect/Option.OptionTypeLambda`     |  224 | `root-declaration` | **optional** |

## Optional

### `effect/Option.OptionIterator`

- **Source:** `packages/effect/src/Option.ts:102`
- **Kind / category:** `root-declaration` / `generators`
- **Priority:** **optional**
- **Current description:** Iterator protocol used to yield an `Option` inside `gen`, returning the contained value type back to the generator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Option.OptionIterator`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Option.Option (type) (type)`

- **Source:** `packages/effect/src/Option.ts:55`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `Option` data type represents optional values. An `Option<A>` is either `Some<A>`, containing a value of type `A`, or `None`, representing absence.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Option.Option (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Option.None`

- **Source:** `packages/effect/src/Option.ts:75`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the absence of a value within an `Option`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Option.None`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Option.Some`

- **Source:** `packages/effect/src/Option.ts:128`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the presence of a value within an `Option`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Option.Some`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Option.OptionUnify`

- **Source:** `packages/effect/src/Option.ts:158`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level unification support for `Option` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Option.OptionUnify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Option.Option (type) (type)`

- **Source:** `packages/effect/src/Option.ts:171`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing utility types for `Option`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Option.Option (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Option.OptionUnifyIgnore`

- **Source:** `packages/effect/src/Option.ts:211`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Marker interface used by Effect's `Unify` machinery for `Option` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Option.OptionUnifyIgnore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Option.OptionTypeLambda`

- **Source:** `packages/effect/src/Option.ts:224`
- **Kind / category:** `root-declaration` / `type lambdas`
- **Priority:** **optional**
- **Current description:** Type lambda interface for higher-kinded type encodings with `Option`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Option.OptionTypeLambda`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

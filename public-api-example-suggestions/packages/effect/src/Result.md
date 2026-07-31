# Example Suggestions: `effect/Result`

- **Package:** `effect`
- **Source:** `packages/effect/src/Result.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 0 recommended, 6 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                               | Line | Kind                    | Priority     |
| --------------------------------- | ---: | ----------------------- | ------------ |
| `effect/Result.ResultIterator`    |  124 | `root-declaration`      | **optional** |
| `effect/Result.ResultUnify`       |  183 | `root-declaration`      | **optional** |
| `effect/Result.ResultUnifyIgnore` |  198 | `root-declaration`      | **optional** |
| `effect/Result.ResultTypeLambda`  |  212 | `root-declaration`      | **optional** |
| `effect/Result.Result.Failure`    |  246 | `namespace-declaration` | **optional** |
| `effect/Result.Result.Success`    |  253 | `namespace-declaration` | **optional** |

## Optional

### `effect/Result.ResultIterator`

- **Source:** `packages/effect/src/Result.ts:124`
- **Kind / category:** `root-declaration` / `generators`
- **Priority:** **optional**
- **Current description:** Iterator protocol used to yield a `Result` inside `gen`, returning the success value type back to the generator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Result.ResultIterator`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Result.ResultUnify`

- **Source:** `packages/effect/src/Result.ts:183`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level utility for unifying `Result` types in generic contexts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Result.ResultUnify`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Result.ResultUnifyIgnore`

- **Source:** `packages/effect/src/Result.ts:198`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Marker interface for ignoring unification in `Result` types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Result.ResultUnifyIgnore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Result.ResultTypeLambda`

- **Source:** `packages/effect/src/Result.ts:212`
- **Kind / category:** `root-declaration` / `type lambdas`
- **Priority:** **optional**
- **Current description:** Higher-kinded type representation for `Result`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Result.ResultTypeLambda`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Result.Result.Failure`

- **Source:** `packages/effect/src/Result.ts:246`
- **Kind / category:** `namespace-declaration` / `Type Level`
- **Priority:** **optional**
- **Current description:** Extracts the failure type `E` from `Result<A, E>`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Result.Result.Failure`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Result.Result.Success`

- **Source:** `packages/effect/src/Result.ts:253`
- **Kind / category:** `namespace-declaration` / `Type Level`
- **Priority:** **optional**
- **Current description:** Extracts the success type `A` from `Result<A, E>`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Result.Result.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

# Example Suggestions: `effect/Deferred`

- **Package:** `effect`
- **Source:** `packages/effect/src/Deferred.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 1 recommended, 1 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                 | Line | Kind                    | Priority        |
| ----------------------------------- | ---: | ----------------------- | --------------- |
| `effect/Deferred.isDeferred`        |   74 | `root-declaration`      | **recommended** |
| `effect/Deferred.Deferred`          |   85 | `namespace`             | **optional**    |
| `effect/Deferred.isDoneUnsafe`      |  710 | `root-declaration`      | **discouraged** |
| `effect/Deferred.Deferred.Variance` |  102 | `namespace-declaration` | **discouraged** |

## Recommended

### `effect/Deferred.isDeferred`

- **Source:** `packages/effect/src/Deferred.ts:74`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks whether a value is a `Deferred`.
- **Signature hint:** `declare function isDeferred<A, E>(u: unknown): u is Deferred<A, E>`
- **Import guidance:** Start from `import { Deferred } from "effect"` and use `Deferred.isDeferred`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Deferred.isDeferred` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Deferred.Deferred`

- **Source:** `packages/effect/src/Deferred.ts:85`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace containing type-level metadata for `Deferred`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Deferred.Deferred`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Deferred.isDoneUnsafe`

- **Source:** `packages/effect/src/Deferred.ts:710`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **discouraged**
- **Current description:** Returns whether this `Deferred` has already been completed synchronously.
- **Signature hint:** `declare function isDoneUnsafe<A, E>(self: Deferred<A, E>): boolean`
- **Import guidance:** Start from `import { Deferred } from "effect"` and use `Deferred.isDoneUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Deferred.isDoneUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Deferred.Deferred.Variance`

- **Source:** `packages/effect/src/Deferred.ts:102`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for the value and error channels of `Deferred`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Deferred.Deferred.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

# Example Suggestions: `effect/SubscriptionRef`

- **Package:** `effect`
- **Source:** `packages/effect/src/SubscriptionRef.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 2 recommended, 2 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind                    | Priority        |
| ------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/SubscriptionRef.isSubscriptionRef`             |   54 | `root-declaration`      | **recommended** |
| `effect/SubscriptionRef.make`                          |  111 | `root-declaration`      | **recommended** |
| `effect/SubscriptionRef.SubscriptionRef (type) (type)` |   37 | `root-declaration`      | **optional**    |
| `effect/SubscriptionRef.SubscriptionRef (type) (type)` |   64 | `namespace`             | **optional**    |
| `effect/SubscriptionRef.SubscriptionRef.Variance`      |   72 | `namespace-declaration` | **discouraged** |

## Recommended

### `effect/SubscriptionRef.isSubscriptionRef`

- **Source:** `packages/effect/src/SubscriptionRef.ts:54`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if the provided value is a `SubscriptionRef`.
- **Signature hint:** `declare function isSubscriptionRef(u: unknown): u is SubscriptionRef<unknown>`
- **Import guidance:** Start from `import { SubscriptionRef } from "effect"` and use `SubscriptionRef.isSubscriptionRef`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `SubscriptionRef.isSubscriptionRef` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SubscriptionRef.make`

- **Source:** `packages/effect/src/SubscriptionRef.ts:111`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs a new `SubscriptionRef` from an initial value.
- **Signature hint:** `declare function make<A>(value: A): Effect.Effect<SubscriptionRef<A>>`
- **Import guidance:** Start from `import { SubscriptionRef } from "effect"` and use `SubscriptionRef.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SubscriptionRef.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/SubscriptionRef.SubscriptionRef (type) (type)`

- **Source:** `packages/effect/src/SubscriptionRef.ts:37`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A mutable reference whose updates are serialized and published to subscribers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SubscriptionRef.SubscriptionRef (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SubscriptionRef.SubscriptionRef (type) (type)`

- **Source:** `packages/effect/src/SubscriptionRef.ts:64`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** The `SubscriptionRef` namespace containing type definitions associated with subscription references.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SubscriptionRef.SubscriptionRef (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/SubscriptionRef.SubscriptionRef.Variance`

- **Source:** `packages/effect/src/SubscriptionRef.ts:72`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for the value type carried by a `SubscriptionRef`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/SubscriptionRef.SubscriptionRef.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

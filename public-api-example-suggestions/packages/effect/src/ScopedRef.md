# Example Suggestions: `effect/ScopedRef`

- **Package:** `effect`
- **Source:** `packages/effect/src/ScopedRef.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 4 recommended, 1 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                            | Line | Kind               | Priority        |
| ------------------------------ | ---: | ------------------ | --------------- |
| `effect/ScopedRef.fromAcquire` |   75 | `root-declaration` | **recommended** |
| `effect/ScopedRef.get`         |  118 | `root-declaration` | **recommended** |
| `effect/ScopedRef.make`        |  145 | `root-declaration` | **recommended** |
| `effect/ScopedRef.set`         |  171 | `root-declaration` | **recommended** |
| `effect/ScopedRef.ScopedRef`   |   38 | `root-declaration` | **optional**    |
| `effect/ScopedRef.getUnsafe`   |  103 | `root-declaration` | **discouraged** |

## Recommended

### `effect/ScopedRef.fromAcquire`

- **Source:** `packages/effect/src/ScopedRef.ts:75`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a new `ScopedRef` from an effect that acquires the initial value.
- **Signature hint:** `declare function fromAcquire<A, E, R>(acquire: Effect.Effect<A, E, R>): Effect.Effect<ScopedRef<A>, E, Scope.Scope | R>`
- **Import guidance:** Start from `import { ScopedRef } from "effect"` and use `ScopedRef.fromAcquire`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedRef.fromAcquire`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedRef.get`

- **Source:** `packages/effect/src/ScopedRef.ts:118`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Retrieves the current value of the scoped reference effectfully.
- **Signature hint:** `declare function get<A>(self: ScopedRef<A>): Effect.Effect<A>`
- **Import guidance:** Start from `import { ScopedRef } from "effect"` and use `ScopedRef.get`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedRef.get`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedRef.make`

- **Source:** `packages/effect/src/ScopedRef.ts:145`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a new `ScopedRef` from the specified value.
- **Signature hint:** `declare function make<A>(evaluate: LazyArg<A>): Effect.Effect<ScopedRef<A>, never, Scope.Scope>`
- **Import guidance:** Start from `import { ScopedRef } from "effect"` and use `ScopedRef.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedRef.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/ScopedRef.set`

- **Source:** `packages/effect/src/ScopedRef.ts:171`
- **Kind / category:** `root-declaration` / `setters`
- **Priority:** **recommended**
- **Current description:** Sets the value of this reference to a newly acquired scoped value, releasing any resources associated with the old value.
- **Signature hint:** `declare function set<A, R, E>(acquire: Effect.Effect<A, E, R>): (self: ScopedRef<A>) => Effect.Effect<void, E, Exclude<R, Scope.Scope>> declare function set<A, R, E>(self: ScopedRef<A>, acquire: Effect.Effect<A, E, R>): Effect.Effect<void, E, Exclude<R, Scope.Scope>>`
- **Import guidance:** Start from `import { ScopedRef } from "effect"` and use `ScopedRef.set`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `ScopedRef.set`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/ScopedRef.ScopedRef`

- **Source:** `packages/effect/src/ScopedRef.ts:38`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A `ScopedRef` is a reference whose value is associated with resources, which must be released properly. You can both get the current value of any `ScopedRef`, as well as set it to a new value (which may require new resources). The reference itself takes care of properly releasing resources for the old value whenever a new value is obtained.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/ScopedRef.ScopedRef`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/ScopedRef.getUnsafe`

- **Source:** `packages/effect/src/ScopedRef.ts:103`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **discouraged**
- **Current description:** Retrieves the current value of the scoped reference synchronously.
- **Signature hint:** `declare function getUnsafe<A>(self: ScopedRef<A>): A`
- **Import guidance:** Start from `import { ScopedRef } from "effect"` and use `ScopedRef.getUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `ScopedRef.getUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

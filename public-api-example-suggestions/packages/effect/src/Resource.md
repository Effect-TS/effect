# Example Suggestions: `effect/Resource`

- **Package:** `effect`
- **Source:** `packages/effect/src/Resource.ts`
- **Uncovered API records:** 6
- **Priorities:** 1 required, 4 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                          | Line | Kind               | Priority        |
| ---------------------------- | ---: | ------------------ | --------------- |
| `effect/Resource.refresh`    |  183 | `root-declaration` | **required**    |
| `effect/Resource.isResource` |   62 | `root-declaration` | **recommended** |
| `effect/Resource.manual`     |   99 | `root-declaration` | **recommended** |
| `effect/Resource.auto`       |  128 | `root-declaration` | **recommended** |
| `effect/Resource.get`        |  154 | `root-declaration` | **recommended** |
| `effect/Resource.Resource`   |   41 | `root-declaration` | **optional**    |

## Required

### `effect/Resource.refresh`

- **Source:** `packages/effect/src/Resource.ts:183`
- **Kind / category:** `root-declaration` / `resource management`
- **Priority:** **required**
- **Current description:** Re-runs this resource's acquisition effect and updates the current value.
- **Signature hint:** `declare function refresh<A, E>(self: Resource<A, E>): Effect.Effect<void, E>`
- **Import guidance:** Start from `import { Resource } from "effect"` and use `Resource.refresh`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Resource.refresh`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `effect/Resource.isResource`

- **Source:** `packages/effect/src/Resource.ts:62`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if the specified value is a `Resource`.
- **Signature hint:** `declare function isResource(u: unknown): u is Resource<unknown, unknown>`
- **Import guidance:** Start from `import { Resource } from "effect"` and use `Resource.isResource`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Resource.isResource` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Resource.manual`

- **Source:** `packages/effect/src/Resource.ts:99`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Resource` that must be refreshed manually.
- **Signature hint:** `declare function manual<A, E, R>(acquire: Effect.Effect<A, E, R>): Effect.Effect<Resource<A, E>, never, Scope.Scope | R>`
- **Import guidance:** Start from `import { Resource } from "effect"` and use `Resource.manual`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Resource.manual`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Resource.auto`

- **Source:** `packages/effect/src/Resource.ts:128`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Resource` that refreshes automatically according to the supplied schedule.
- **Signature hint:** `declare function auto<A, E, R, Out, E2, R2>(acquire: Effect.Effect<A, E, R>, policy: Schedule.Schedule<Out, unknown, E2, R2>): Effect.Effect<Resource<A, E>, never, R | R2 | Scope.Scope>`
- **Import guidance:** Start from `import { Resource } from "effect"` and use `Resource.auto`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Resource.auto`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Resource.get`

- **Source:** `packages/effect/src/Resource.ts:154`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **recommended**
- **Current description:** Retrieves the current value stored in this resource.
- **Signature hint:** `declare function get<A, E>(self: Resource<A, E>): Effect.Effect<A, E>`
- **Import guidance:** Start from `import { Resource } from "effect"` and use `Resource.get`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Resource.get`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Resource.Resource`

- **Source:** `packages/effect/src/Resource.ts:41`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A `Resource` is a value loaded into memory that can be refreshed manually or automatically according to a schedule.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Resource.Resource`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

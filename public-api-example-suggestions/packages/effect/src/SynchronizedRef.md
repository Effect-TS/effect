# Example Suggestions: `effect/SynchronizedRef`

- **Package:** `effect`
- **Source:** `packages/effect/src/SynchronizedRef.ts`
- **Uncovered API records:** 24
- **Priorities:** 0 required, 12 recommended, 10 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                             | Line | Kind               | Priority        |
| ----------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/SynchronizedRef.getAndSet`              |  140 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.getAndUpdate`           |  165 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.getAndUpdateEffect`     |  192 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.modifyEffect`           |  306 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.modifySomeEffect`       |  368 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.set`                    |  410 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.update`                 |  458 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.updateEffect`           |  485 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.updateAndGetEffect`     |  538 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.make`                   |   91 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.modify`                 |  282 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.setAndGet`              |  433 | `root-declaration` | **recommended** |
| `effect/SynchronizedRef.getAndUpdateSomeEffect` |  248 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.updateSomeEffect`       |  592 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.updateSomeAndGetEffect` |  652 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.get`                    |  122 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.getAndUpdateSome`       |  223 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.modifySome`             |  336 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.updateAndGet`           |  514 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.updateSome`             |  568 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.updateSomeAndGet`       |  627 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.SynchronizedRef`        |   37 | `root-declaration` | **optional**    |
| `effect/SynchronizedRef.getUnsafe`              |  107 | `root-declaration` | **discouraged** |
| `effect/SynchronizedRef.makeUnsafe`             |   65 | `root-declaration` | **discouraged** |

## Recommended

### `effect/SynchronizedRef.getAndSet`

- **Source:** `packages/effect/src/SynchronizedRef.ts:140`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Sets a new value atomically and returns the previous value, serialized by the ref's semaphore.
- **Signature hint:** `declare function getAndSet<A>(value: A): (self: SynchronizedRef<A>) => Effect.Effect<A> declare function getAndSet<A>(self: SynchronizedRef<A>, value: A): Effect.Effect<A>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.getAndSet`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.getAndSet`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.getAndUpdate`

- **Source:** `packages/effect/src/SynchronizedRef.ts:165`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Updates the current value atomically with a function and returns the previous value, serialized by the ref's semaphore.
- **Signature hint:** `declare function getAndUpdate<A>(f: (a: A) => A): (self: SynchronizedRef<A>) => Effect.Effect<A> declare function getAndUpdate<A>(self: SynchronizedRef<A>, f: (a: A) => A): Effect.Effect<A>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.getAndUpdate`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.getAndUpdate`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.getAndUpdateEffect`

- **Source:** `packages/effect/src/SynchronizedRef.ts:192`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Runs an effectful update atomically while holding the ref's semaphore, sets the new value if the effect succeeds, and returns the previous value.
- **Signature hint:** `declare function getAndUpdateEffect<A, R, E>(f: (a: A) => Effect.Effect<A, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<A, E, R> declare function getAndUpdateEffect<A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.getAndUpdateEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.getAndUpdateEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.modifyEffect`

- **Source:** `packages/effect/src/SynchronizedRef.ts:306`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Runs an effectful modification atomically while holding the ref's semaphore, stores the new value if the effect succeeds, and returns the computed result.
- **Signature hint:** `declare function modifyEffect<A, B, E, R>(f: (a: A) => Effect.Effect<readonly [B, A], E, R>): (self: SynchronizedRef<A>) => Effect.Effect<B, E, R> declare function modifyEffect<A, B, E, R>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<readonly [B, A], E, R>): Effect.Effect<B, E, R>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.modifyEffect`.
- **Suggested snippet:** Create the smallest mutable reference supported by the module, apply `SynchronizedRef.modifyEffect` with an update that returns a visibly different result and state, then read the state and assert both observable values. For Effect-returning variants, include failure preservation only when tests establish it.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.modifySomeEffect`

- **Source:** `packages/effect/src/SynchronizedRef.ts:368`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Runs an effectful modification atomically while holding the ref's semaphore. The effect computes a return value and an optional new ref value; `Option.some` updates the ref and `Option.none` leaves it unchanged.
- **Signature hint:** `declare function modifySomeEffect<A, B, R, E>(fallback: B, pf: (a: A) => Effect.Effect<readonly [B, Option.Option<A>], E, R>): (self: SynchronizedRef<A>) => Effect.Effect<B, E, R> declare function modifySomeEffect<A, B, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Effect.Effect<readonly [B, Option.Option<A>], E, R>): Effect.Effect<B, E, R>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.modifySomeEffect`.
- **Suggested snippet:** Create a `SynchronizedRef`, run `SynchronizedRef.modifySomeEffect` once with a callback producing `Option.some`, then read the ref and assert the operation's actual return value plus the updated state. If useful, contrast `Option.none()` to show that it leaves the state unchanged; the `Option` controls the update and is not the API result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.set`

- **Source:** `packages/effect/src/SynchronizedRef.ts:410`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Sets the value of the `SynchronizedRef`, serialized by the ref's semaphore.
- **Signature hint:** `declare function set<A>(value: A): (self: SynchronizedRef<A>) => Effect.Effect<void> declare function set<A>(self: SynchronizedRef<A>, value: A): Effect.Effect<void>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.set`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.set`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.update`

- **Source:** `packages/effect/src/SynchronizedRef.ts:458`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Updates the value of the `SynchronizedRef` with a function, serialized by the ref's semaphore.
- **Signature hint:** `declare function update<A>(f: (a: A) => A): (self: SynchronizedRef<A>) => Effect.Effect<void> declare function update<A>(self: SynchronizedRef<A>, f: (a: A) => A): Effect.Effect<void>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.update`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.update`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.updateEffect`

- **Source:** `packages/effect/src/SynchronizedRef.ts:485`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Runs an effectful update while holding the ref's semaphore and stores the new value if the effect succeeds.
- **Signature hint:** `declare function updateEffect<A, R, E>(f: (a: A) => Effect.Effect<A, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<void, E, R> declare function updateEffect<A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<void, E, R>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.updateEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.updateEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.updateAndGetEffect`

- **Source:** `packages/effect/src/SynchronizedRef.ts:538`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Runs an effectful update while holding the ref's semaphore, stores the new value if the effect succeeds, and returns that new value.
- **Signature hint:** `declare function updateAndGetEffect<A, R, E>(f: (a: A) => Effect.Effect<A, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<A, E, R> declare function updateAndGetEffect<A, R, E>(self: SynchronizedRef<A>, f: (a: A) => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.updateAndGetEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.updateAndGetEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.make`

- **Source:** `packages/effect/src/SynchronizedRef.ts:91`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `SynchronizedRef` from an initial value, wrapped in an `Effect`.
- **Signature hint:** `declare function make<A>(value: A): Effect.Effect<SynchronizedRef<A>>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.modify`

- **Source:** `packages/effect/src/SynchronizedRef.ts:282`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Computes a return value and a new ref value atomically, stores the new value, and returns the computed result.
- **Signature hint:** `declare function modify<A, B>(f: (a: A) => readonly [B, A]): (self: SynchronizedRef<A>) => Effect.Effect<B> declare function modify<A, B>(self: SynchronizedRef<A>, f: (a: A) => readonly [B, A]): Effect.Effect<B>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.modify`.
- **Suggested snippet:** Create the smallest mutable reference supported by the module, apply `SynchronizedRef.modify` with an update that returns a visibly different result and state, then read the state and assert both observable values. For Effect-returning variants, include failure preservation only when tests establish it.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/SynchronizedRef.setAndGet`

- **Source:** `packages/effect/src/SynchronizedRef.ts:433`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **recommended**
- **Current description:** Sets the value of the `SynchronizedRef` and returns the new value.
- **Signature hint:** `declare function setAndGet<A>(value: A): (self: SynchronizedRef<A>) => Effect.Effect<A> declare function setAndGet<A>(self: SynchronizedRef<A>, value: A): Effect.Effect<A>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.setAndGet`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.setAndGet`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/SynchronizedRef.getAndUpdateSomeEffect`

- **Source:** `packages/effect/src/SynchronizedRef.ts:248`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **optional**
- **Current description:** Runs an effectful partial update atomically while holding the ref's semaphore and returns the previous value. `Option.some` updates the ref; `Option.none` leaves it unchanged.
- **Signature hint:** `declare function getAndUpdateSomeEffect<A, R, E>(pf: (a: A) => Effect.Effect<Option.Option<A>, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<A, E, R> declare function getAndUpdateSomeEffect<A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Effect.Effect<Option.Option<A>, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.getAndUpdateSomeEffect`.
- **Suggested snippet:** Create a `SynchronizedRef`, run `SynchronizedRef.getAndUpdateSomeEffect` once with a callback producing `Option.some`, then read the ref and assert the operation's actual return value plus the updated state. If useful, contrast `Option.none()` to show that it leaves the state unchanged; the `Option` controls the update and is not the API result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SynchronizedRef.updateSomeEffect`

- **Source:** `packages/effect/src/SynchronizedRef.ts:592`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **optional**
- **Current description:** Runs an effectful partial update while holding the ref's semaphore. `Option.some` stores the new value; `Option.none` leaves the ref unchanged.
- **Signature hint:** `declare function updateSomeEffect<A, R, E>(pf: (a: A) => Effect.Effect<Option.Option<A>, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<void, E, R> declare function updateSomeEffect<A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Effect.Effect<Option.Option<A>, E, R>): Effect.Effect<void, E, R>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.updateSomeEffect`.
- **Suggested snippet:** Create a `SynchronizedRef`, run `SynchronizedRef.updateSomeEffect` once with a callback producing `Option.some`, then read the ref and assert the operation's actual return value plus the updated state. If useful, contrast `Option.none()` to show that it leaves the state unchanged; the `Option` controls the update and is not the API result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SynchronizedRef.updateSomeAndGetEffect`

- **Source:** `packages/effect/src/SynchronizedRef.ts:652`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **optional**
- **Current description:** Runs an effectful partial update while holding the ref's semaphore and returns the resulting current value. `Option.some` stores and returns the new value; `Option.none` returns the unchanged value.
- **Signature hint:** `declare function updateSomeAndGetEffect<A, R, E>(pf: (a: A) => Effect.Effect<Option.Option<A>, E, R>): (self: SynchronizedRef<A>) => Effect.Effect<A, E, R> declare function updateSomeAndGetEffect<A, R, E>(self: SynchronizedRef<A>, pf: (a: A) => Effect.Effect<Option.Option<A>, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.updateSomeAndGetEffect`.
- **Suggested snippet:** Create a `SynchronizedRef`, run `SynchronizedRef.updateSomeAndGetEffect` once with a callback producing `Option.some`, then read the ref and assert the operation's actual return value plus the updated state. If useful, contrast `Option.none()` to show that it leaves the state unchanged; the `Option` controls the update and is not the API result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SynchronizedRef.get`

- **Source:** `packages/effect/src/SynchronizedRef.ts:122`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **optional**
- **Current description:** Returns an `Effect` that reads the current value of the `SynchronizedRef`.
- **Signature hint:** `declare function get<A>(self: SynchronizedRef<A>): Effect.Effect<A>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.get`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.get`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SynchronizedRef.getAndUpdateSome`

- **Source:** `packages/effect/src/SynchronizedRef.ts:223`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **optional**
- **Current description:** Applies a partial update atomically and returns the previous value. If the function returns `Option.some`, the ref is updated; if it returns `Option.none`, the ref is left unchanged.
- **Signature hint:** `declare function getAndUpdateSome<A>(pf: (a: A) => Option.Option<A>): (self: SynchronizedRef<A>) => Effect.Effect<A> declare function getAndUpdateSome<A>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<A>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.getAndUpdateSome`.
- **Suggested snippet:** Create a `SynchronizedRef`, run `SynchronizedRef.getAndUpdateSome` once with a callback producing `Option.some`, then read the ref and assert the operation's actual return value plus the updated state. If useful, contrast `Option.none()` to show that it leaves the state unchanged; the `Option` controls the update and is not the API result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SynchronizedRef.modifySome`

- **Source:** `packages/effect/src/SynchronizedRef.ts:336`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **optional**
- **Current description:** Computes a return value and an optional new ref value atomically. `Option.some` updates the ref; `Option.none` leaves it unchanged.
- **Signature hint:** `declare function modifySome<B, A>(pf: (a: A) => readonly [B, Option.Option<A>]): (self: SynchronizedRef<A>) => Effect.Effect<B> declare function modifySome<A, B>(self: SynchronizedRef<A>, pf: (a: A) => readonly [B, Option.Option<A>]): Effect.Effect<B>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.modifySome`.
- **Suggested snippet:** Create a `SynchronizedRef`, run `SynchronizedRef.modifySome` once with a callback producing `Option.some`, then read the ref and assert the operation's actual return value plus the updated state. If useful, contrast `Option.none()` to show that it leaves the state unchanged; the `Option` controls the update and is not the API result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SynchronizedRef.updateAndGet`

- **Source:** `packages/effect/src/SynchronizedRef.ts:514`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **optional**
- **Current description:** Updates the value of the `SynchronizedRef` with a function and returns the new value.
- **Signature hint:** `declare function updateAndGet<A>(f: (a: A) => A): (self: SynchronizedRef<A>) => Effect.Effect<A> declare function updateAndGet<A>(self: SynchronizedRef<A>, f: (a: A) => A): Effect.Effect<A>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.updateAndGet`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SynchronizedRef.updateAndGet`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SynchronizedRef.updateSome`

- **Source:** `packages/effect/src/SynchronizedRef.ts:568`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **optional**
- **Current description:** Applies a partial update to the current value. `Option.some` stores the new value; `Option.none` leaves the ref unchanged.
- **Signature hint:** `declare function updateSome<A>(f: (a: A) => Option.Option<A>): (self: SynchronizedRef<A>) => Effect.Effect<void> declare function updateSome<A>(self: SynchronizedRef<A>, f: (a: A) => Option.Option<A>): Effect.Effect<void>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.updateSome`.
- **Suggested snippet:** Create a `SynchronizedRef`, run `SynchronizedRef.updateSome` once with a callback producing `Option.some`, then read the ref and assert the operation's actual return value plus the updated state. If useful, contrast `Option.none()` to show that it leaves the state unchanged; the `Option` controls the update and is not the API result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SynchronizedRef.updateSomeAndGet`

- **Source:** `packages/effect/src/SynchronizedRef.ts:627`
- **Kind / category:** `root-declaration` / `mutations`
- **Priority:** **optional**
- **Current description:** Applies a partial update and returns the resulting current value. `Option.some` stores and returns the new value; `Option.none` returns the unchanged value.
- **Signature hint:** `declare function updateSomeAndGet<A>(pf: (a: A) => Option.Option<A>): (self: SynchronizedRef<A>) => Effect.Effect<A> declare function updateSomeAndGet<A>(self: SynchronizedRef<A>, pf: (a: A) => Option.Option<A>): Effect.Effect<A>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.updateSomeAndGet`.
- **Suggested snippet:** Create a `SynchronizedRef`, run `SynchronizedRef.updateSomeAndGet` once with a callback producing `Option.some`, then read the ref and assert the operation's actual return value plus the updated state. If useful, contrast `Option.none()` to show that it leaves the state unchanged; the `Option` controls the update and is not the API result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/SynchronizedRef.SynchronizedRef`

- **Source:** `packages/effect/src/SynchronizedRef.ts:37`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A mutable reference whose update and modify operations are serialized with an internal semaphore, including effectful transformations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/SynchronizedRef.SynchronizedRef`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/SynchronizedRef.getUnsafe`

- **Source:** `packages/effect/src/SynchronizedRef.ts:107`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **discouraged**
- **Current description:** Reads the current value synchronously, bypassing the `Effect` API and the ref's semaphore.
- **Signature hint:** `declare function getUnsafe<A>(self: SynchronizedRef<A>): A`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.getUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `SynchronizedRef.getUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/SynchronizedRef.makeUnsafe`

- **Source:** `packages/effect/src/SynchronizedRef.ts:65`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **discouraged**
- **Current description:** Creates a `SynchronizedRef` synchronously from an initial value.
- **Signature hint:** `declare function makeUnsafe<A>(value: A): SynchronizedRef<A>`
- **Import guidance:** Start from `import { SynchronizedRef } from "effect"` and use `SynchronizedRef.makeUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `SynchronizedRef.makeUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

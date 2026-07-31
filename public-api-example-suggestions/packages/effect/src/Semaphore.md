# Example Suggestions: `effect/Semaphore`

- **Package:** `effect`
- **Source:** `packages/effect/src/Semaphore.ts`
- **Uncovered API records:** 16
- **Priorities:** 0 required, 8 recommended, 8 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/Semaphore.resize`                           |  375 | `root-declaration` | **recommended** |
| `effect/Semaphore.withPermits`                      |  402 | `root-declaration` | **recommended** |
| `effect/Semaphore.withPermit`                       |  427 | `root-declaration` | **recommended** |
| `effect/Semaphore.withPermitsIfAvailable`           |  456 | `root-declaration` | **recommended** |
| `effect/Semaphore.take`                             |  489 | `root-declaration` | **recommended** |
| `effect/Semaphore.takeIfAvailable`                  |  516 | `root-declaration` | **recommended** |
| `effect/Semaphore.release`                          |  549 | `root-declaration` | **recommended** |
| `effect/Semaphore.releaseAll`                       |  569 | `root-declaration` | **recommended** |
| `effect/Semaphore.Semaphore.resize`                 |   65 | `member`           | **optional**    |
| `effect/Semaphore.Semaphore.withPermits`            |   82 | `member`           | **optional**    |
| `effect/Semaphore.Semaphore.withPermit`             |   99 | `member`           | **optional**    |
| `effect/Semaphore.Semaphore.withPermitsIfAvailable` |  117 | `member`           | **optional**    |
| `effect/Semaphore.Semaphore.take`                   |  133 | `member`           | **optional**    |
| `effect/Semaphore.Semaphore.takeIfAvailable`        |  143 | `member`           | **optional**    |
| `effect/Semaphore.Semaphore.release`                |  154 | `member`           | **optional**    |
| `effect/Semaphore.Semaphore.releaseAll`             |  163 | `member`           | **optional**    |

## Recommended

### `effect/Semaphore.resize`

- **Source:** `packages/effect/src/Semaphore.ts:375`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Sets the total number of permits managed by the semaphore.
- **Signature hint:** `declare function resize(permits: number): (self: Semaphore) => Effect.Effect<void> declare function resize(self: Semaphore, permits: number): Effect.Effect<void>`
- **Import guidance:** Start from `import { Semaphore } from "effect"` and use `Semaphore.resize`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Semaphore.resize`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Semaphore.withPermits`

- **Source:** `packages/effect/src/Semaphore.ts:402`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Runs an effect with the given number of permits and releases the permits when the effect completes.
- **Signature hint:** `declare function withPermits(self: Semaphore, permits: number): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> declare function withPermits<A, E, R>(self: Semaphore, permits: number, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { Semaphore } from "effect"` and use `Semaphore.withPermits`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Semaphore.withPermits`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Semaphore.withPermit`

- **Source:** `packages/effect/src/Semaphore.ts:427`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Runs an effect with a single permit and releases the permit when the effect completes.
- **Signature hint:** `declare function withPermit(self: Semaphore): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> declare function withPermit<A, E, R>(self: Semaphore, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { Semaphore } from "effect"` and use `Semaphore.withPermit`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Semaphore.withPermit`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Semaphore.withPermitsIfAvailable`

- **Source:** `packages/effect/src/Semaphore.ts:456`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Runs an effect only if the specified number of permits are immediately available.
- **Signature hint:** `declare function withPermitsIfAvailable(self: Semaphore, permits: number): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<Option.Option<A>, E, R> declare function withPermitsIfAvailable<A, E, R>(self: Semaphore, permits: number, effect: Effect.Effect<A, E, R>): Effect.Effect<Option.Option<A>, E, R>`
- **Import guidance:** Start from `import { Semaphore } from "effect"` and use `Semaphore.withPermitsIfAvailable`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Semaphore.withPermitsIfAvailable`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Semaphore.take`

- **Source:** `packages/effect/src/Semaphore.ts:489`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Acquires the specified number of permits and returns the acquired permit count.
- **Signature hint:** `declare function take(permits: number): (self: Semaphore) => Effect.Effect<number> declare function take(self: Semaphore, permits: number): Effect.Effect<number>`
- **Import guidance:** Start from `import { Semaphore } from "effect"` and use `Semaphore.take`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Semaphore.take`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Semaphore.takeIfAvailable`

- **Source:** `packages/effect/src/Semaphore.ts:516`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Acquires the specified number of permits only if they are immediately available.
- **Signature hint:** `declare function takeIfAvailable(permits: number): (self: Semaphore) => Effect.Effect<boolean> declare function takeIfAvailable(self: Semaphore, permits: number): Effect.Effect<boolean>`
- **Import guidance:** Start from `import { Semaphore } from "effect"` and use `Semaphore.takeIfAvailable`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Semaphore.takeIfAvailable`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Semaphore.release`

- **Source:** `packages/effect/src/Semaphore.ts:549`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Releases the specified number of permits and returns the resulting available permits.
- **Signature hint:** `declare function release(permits: number): (self: Semaphore) => Effect.Effect<number> declare function release(self: Semaphore, permits: number): Effect.Effect<number>`
- **Import guidance:** Start from `import { Semaphore } from "effect"` and use `Semaphore.release`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Semaphore.release`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Semaphore.releaseAll`

- **Source:** `packages/effect/src/Semaphore.ts:569`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Releases all permits held by this semaphore and returns the resulting available permits.
- **Signature hint:** `declare function releaseAll(self: Semaphore): Effect.Effect<number>`
- **Import guidance:** Start from `import { Semaphore } from "effect"` and use `Semaphore.releaseAll`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Semaphore.releaseAll`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Semaphore.Semaphore.resize`

- **Source:** `packages/effect/src/Semaphore.ts:65`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Adjusts the number of permits available in the semaphore.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Semaphore.Semaphore.resize` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Semaphore.Semaphore.withPermits`

- **Source:** `packages/effect/src/Semaphore.ts:82`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Runs an effect with the given number of permits and releases the permits when the effect completes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Semaphore.Semaphore.withPermits` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Semaphore.Semaphore.withPermit`

- **Source:** `packages/effect/src/Semaphore.ts:99`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Runs an effect with the given number of permits and releases the permits when the effect completes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Semaphore.Semaphore.withPermit` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Semaphore.Semaphore.withPermitsIfAvailable`

- **Source:** `packages/effect/src/Semaphore.ts:117`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Runs an effect only if the specified number of permits are immediately available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Semaphore.Semaphore.withPermitsIfAvailable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Semaphore.Semaphore.take`

- **Source:** `packages/effect/src/Semaphore.ts:133`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Acquires the specified number of permits and returns the acquired permit count, suspending the task if they are not yet available. Pending `take` calls are scanned in registration order, but a request is served only when enough permits are available, so a smaller later request may overtake a larger earlier request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Semaphore.Semaphore.take` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Semaphore.Semaphore.takeIfAvailable`

- **Source:** `packages/effect/src/Semaphore.ts:143`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Acquires the specified number of permits only if they are immediately available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Semaphore.Semaphore.takeIfAvailable` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Semaphore.Semaphore.release`

- **Source:** `packages/effect/src/Semaphore.ts:154`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Releases the specified number of permits and returns the resulting available permits.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Semaphore.Semaphore.release` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Semaphore.Semaphore.releaseAll`

- **Source:** `packages/effect/src/Semaphore.ts:163`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Releases all permits held by this semaphore and returns the resulting available permits.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Semaphore.Semaphore.releaseAll` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

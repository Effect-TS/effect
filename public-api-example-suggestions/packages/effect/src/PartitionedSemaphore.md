# Example Suggestions: `effect/PartitionedSemaphore`

- **Package:** `effect`
- **Source:** `packages/effect/src/PartitionedSemaphore.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 7 recommended, 3 optional, 3 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind               | Priority        |
| ------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/PartitionedSemaphore.release`                   |  425 | `root-declaration` | **recommended** |
| `effect/PartitionedSemaphore.make`                      |  322 | `root-declaration` | **recommended** |
| `effect/PartitionedSemaphore.available`                 |  350 | `root-declaration` | **recommended** |
| `effect/PartitionedSemaphore.take`                      |  398 | `root-declaration` | **recommended** |
| `effect/PartitionedSemaphore.withPermits`               |  459 | `root-declaration` | **recommended** |
| `effect/PartitionedSemaphore.withPermit`                |  503 | `root-declaration` | **recommended** |
| `effect/PartitionedSemaphore.withPermitsIfAvailable`    |  541 | `root-declaration` | **recommended** |
| `effect/PartitionedSemaphore.capacity`                  |  369 | `root-declaration` | **optional**    |
| `effect/PartitionedSemaphore.PartitionedSemaphore`      |   62 | `root-declaration` | **optional**    |
| `effect/PartitionedSemaphore.Partitioned`               |   94 | `root-declaration` | **optional**    |
| `effect/PartitionedSemaphore.makeUnsafe`                |  115 | `root-declaration` | **discouraged** |
| `effect/PartitionedSemaphore.PartitionedTypeId (value)` |   27 | `root-declaration` | **discouraged** |
| `effect/PartitionedSemaphore.PartitionedTypeId (type)`  |   44 | `root-declaration` | **discouraged** |

## Recommended

### `effect/PartitionedSemaphore.release`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:425`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns an effect that releases permits back to the shared pool and returns the current available permit count.
- **Signature hint:** `declare function release(permits: number): <K>(self: PartitionedSemaphore<K>) => Effect.Effect<number> declare function release<K>(self: PartitionedSemaphore<K>, permits: number): Effect.Effect<number>`
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.release`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PartitionedSemaphore.release`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/PartitionedSemaphore.make`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:322`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `PartitionedSemaphore` inside an `Effect`.
- **Signature hint:** `declare function make<K = unknown>(options: { readonly permits: number; }): Effect.Effect<PartitionedSemaphore<K>>`
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PartitionedSemaphore.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/PartitionedSemaphore.available`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:350`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Gets the current number of available permits.
- **Signature hint:** `declare function available<K>(self: PartitionedSemaphore<K>): Effect.Effect<number>`
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.available`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PartitionedSemaphore.available`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/PartitionedSemaphore.take`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:398`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Returns an effect that acquires the requested number of permits for the given partition key.
- **Signature hint:** `declare function take<K>(key: K, permits: number): (self: PartitionedSemaphore<K>) => Effect.Effect<void> declare function take<K>(self: PartitionedSemaphore<K>, key: K, permits: number): Effect.Effect<void>`
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.take`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PartitionedSemaphore.take`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/PartitionedSemaphore.withPermits`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:459`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Runs an effect after acquiring permits for a partition, then releases those permits when the effect exits.
- **Signature hint:** `declare function withPermits<K>(self: PartitionedSemaphore<K>, key: K, permits: number): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> declare function withPermits<K, A, E, R>(self: PartitionedSemaphore<K>, key: K, permits: number, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.withPermits`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PartitionedSemaphore.withPermits`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/PartitionedSemaphore.withPermit`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:503`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Runs an effect after acquiring one permit for a partition, then releases the permit when the effect exits.
- **Signature hint:** `declare function withPermit<K>(self: PartitionedSemaphore<K>, key: K): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> declare function withPermit<K, A, E, R>(self: PartitionedSemaphore<K>, key: K, effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>`
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.withPermit`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PartitionedSemaphore.withPermit`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/PartitionedSemaphore.withPermitsIfAvailable`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:541`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Runs an effect only when the requested permits can be acquired immediately, returning the result in `Some`.
- **Signature hint:** `declare function withPermitsIfAvailable<K>(self: PartitionedSemaphore<K>, permits: number): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<Option.Option<A>, E, R> declare function withPermitsIfAvailable<K, A, E, R>(self: PartitionedSemaphore<K>, permits: number, effect: Effect.Effect<A, E, R>): Effect.Effect<Option.Option<A>, E, R>`
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.withPermitsIfAvailable`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `PartitionedSemaphore.withPermitsIfAvailable`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/PartitionedSemaphore.capacity`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:369`
- **Kind / category:** `root-declaration` / `getters`
- **Priority:** **optional**
- **Current description:** Gets the total capacity.
- **Signature hint:** `declare function capacity<K>(self: PartitionedSemaphore<K>): number`
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.capacity`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Gets the total capacity. Call `PartitionedSemaphore.capacity` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PartitionedSemaphore.PartitionedSemaphore`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:62`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A `PartitionedSemaphore` controls access to a shared permit pool while tracking waiters by partition key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/PartitionedSemaphore.PartitionedSemaphore`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PartitionedSemaphore.Partitioned`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:94`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Alias interface for a `PartitionedSemaphore` keyed by values of type `K`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/PartitionedSemaphore.Partitioned`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/PartitionedSemaphore.makeUnsafe`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:115`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **discouraged**
- **Current description:** Constructs a `PartitionedSemaphore` synchronously, outside of `Effect`.
- **Signature hint:** `declare function makeUnsafe<K = unknown>(options: { readonly permits: number; }): PartitionedSemaphore<K>`
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.makeUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `PartitionedSemaphore.makeUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/PartitionedSemaphore.PartitionedTypeId (value)`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:27`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark values that implement `PartitionedSemaphore`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PartitionedSemaphore } from "effect"` and use `PartitionedSemaphore.PartitionedTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `PartitionedSemaphore.PartitionedTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/PartitionedSemaphore.PartitionedTypeId (type)`

- **Source:** `packages/effect/src/PartitionedSemaphore.ts:44`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Literal type of the `PartitionedSemaphore` runtime type identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/PartitionedSemaphore.PartitionedTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

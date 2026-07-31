# Example Suggestions: `effect/Queue`

- **Package:** `effect`
- **Source:** `packages/effect/src/Queue.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 4 recommended, 7 optional, 3 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                             | Line | Kind                    | Priority        |
| ------------------------------- | ---: | ----------------------- | --------------- |
| `effect/Queue.isQueue`          |   45 | `root-declaration`      | **recommended** |
| `effect/Queue.isEnqueue`        |   69 | `root-declaration`      | **recommended** |
| `effect/Queue.isDequeue`        |   89 | `root-declaration`      | **recommended** |
| `effect/Queue.await`            | 1647 | `root-declaration`      | **recommended** |
| `effect/Queue.asEnqueue`        |  112 | `root-declaration`      | **optional**    |
| `effect/Queue.asDequeue`        |  133 | `root-declaration`      | **optional**    |
| `effect/Queue.Enqueue`          |  184 | `namespace`             | **optional**    |
| `effect/Queue.Dequeue`          |  253 | `namespace`             | **optional**    |
| `effect/Queue.Queue`            |  316 | `namespace`             | **optional**    |
| `effect/Queue.Queue.State`      |  346 | `namespace-declaration` | **optional**    |
| `effect/Queue.Queue.OfferEntry` |  377 | `namespace-declaration` | **optional**    |
| `effect/Queue.Enqueue.Variance` |  197 | `namespace-declaration` | **discouraged** |
| `effect/Queue.Dequeue.Variance` |  265 | `namespace-declaration` | **discouraged** |
| `effect/Queue.Queue.Variance`   |  328 | `namespace-declaration` | **discouraged** |

## Recommended

### `effect/Queue.isQueue`

- **Source:** `packages/effect/src/Queue.ts:45`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Type guard to check if a value is a Queue.
- **Signature hint:** `declare function isQueue<A = unknown, E = unknown>(u: unknown): u is Queue<A, E>`
- **Import guidance:** Start from `import { Queue } from "effect"` and use `Queue.isQueue`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Queue.isQueue` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Queue.isEnqueue`

- **Source:** `packages/effect/src/Queue.ts:69`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Type guard to check if a value is an Enqueue.
- **Signature hint:** `declare function isEnqueue<A = unknown, E = unknown>(u: unknown): u is Enqueue<A, E>`
- **Import guidance:** Start from `import { Queue } from "effect"` and use `Queue.isEnqueue`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Queue.isEnqueue` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Queue.isDequeue`

- **Source:** `packages/effect/src/Queue.ts:89`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Type guard to check if a value is a Dequeue.
- **Signature hint:** `declare function isDequeue<A = unknown, E = unknown>(u: unknown): u is Dequeue<A, E>`
- **Import guidance:** Start from `import { Queue } from "effect"` and use `Queue.isDequeue`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Queue.isDequeue` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Queue.await`

- **Source:** `packages/effect/src/Queue.ts:1647`
- **Kind / category:** `root-declaration` / `completion`
- **Priority:** **recommended**
- **Current description:** Waits until a queue reaches the `Done` state.
- **Signature hint:** `declare function await<A, E>(self: Dequeue<A, E>): Effect<void, Exclude<E, Done>>`
- **Import guidance:** Start from `import { Queue } from "effect"` and use `Queue.await`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Queue.await`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Queue.asEnqueue`

- **Source:** `packages/effect/src/Queue.ts:112`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts a `Queue` to its write-only `Enqueue` interface.
- **Signature hint:** `declare function asEnqueue<A, E>(self: Queue<A, E>): Enqueue<A, E>`
- **Import guidance:** Start from `import { Queue } from "effect"` and use `Queue.asEnqueue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a `Queue` to its write-only `Enqueue` interface. Call `Queue.asEnqueue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Queue.asDequeue`

- **Source:** `packages/effect/src/Queue.ts:133`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Narrows a `Queue` to a `Dequeue`, exposing the consumer side of the queue.
- **Signature hint:** `declare function asDequeue<A, E>(self: Queue<A, E>): Dequeue<A, E>`
- **Import guidance:** Start from `import { Queue } from "effect"` and use `Queue.asDequeue`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Narrows a `Queue` to a `Dequeue`, exposing the consumer side of the queue. Call `Queue.asDequeue` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Queue.Enqueue`

- **Source:** `packages/effect/src/Queue.ts:184`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace containing type-level metadata for the `Enqueue` write-only queue interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Queue.Enqueue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Queue.Dequeue`

- **Source:** `packages/effect/src/Queue.ts:253`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace containing type-level metadata for the `Dequeue` read-only queue interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Queue.Dequeue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Queue.Queue`

- **Source:** `packages/effect/src/Queue.ts:316`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace containing type-level metadata and low-level state types for `Queue`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Queue.Queue`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Queue.Queue.State`

- **Source:** `packages/effect/src/Queue.ts:346`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tagged state of a `Queue`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Queue.Queue.State`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Queue.Queue.OfferEntry`

- **Source:** `packages/effect/src/Queue.ts:377`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a suspended offer waiting to be admitted to a bounded queue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Queue.Queue.OfferEntry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Queue.Enqueue.Variance`

- **Source:** `packages/effect/src/Queue.ts:197`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for `Enqueue`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Queue.Enqueue.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Queue.Dequeue.Variance`

- **Source:** `packages/effect/src/Queue.ts:265`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for `Dequeue`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Queue.Dequeue.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Queue.Queue.Variance`

- **Source:** `packages/effect/src/Queue.ts:328`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **discouraged**
- **Current description:** Type-level variance marker for `Queue`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Queue.Queue.Variance` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

# Example Suggestions: `effect/PubSub`

- **Package:** `effect`
- **Source:** `packages/effect/src/PubSub.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 0 recommended, 11 optional, 3 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind                    | Priority        |
| --------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/PubSub.makeAtomicBounded`                         |  503 | `root-declaration`      | **optional**    |
| `effect/PubSub.makeAtomicUnbounded`                       |  541 | `root-declaration`      | **optional**    |
| `effect/PubSub.PubSub`                                    |   83 | `namespace`             | **optional**    |
| `effect/PubSub.PubSub.Atomic`                             |   90 | `namespace-declaration` | **optional**    |
| `effect/PubSub.PubSub.BackingSubscription`                |  108 | `namespace-declaration` | **optional**    |
| `effect/PubSub.PubSub.Subscribers`                        |  128 | `namespace-declaration` | **optional**    |
| `effect/PubSub.PubSub.ReplayWindow`                       |  139 | `namespace-declaration` | **optional**    |
| `effect/PubSub.PubSub.Strategy`                           |  153 | `namespace-declaration` | **optional**    |
| `effect/PubSub.PubSub.Strategy.shutdown`                  |  157 | `member`                | **optional**    |
| `effect/PubSub.PubSub.Strategy.handleSurplus`             |  163 | `member`                | **optional**    |
| `effect/PubSub.BackPressureStrategy`                      | 2357 | `root-declaration`      | **optional**    |
| `effect/PubSub.PubSub.Strategy.onPubSubEmptySpaceUnsafe`  |  174 | `member`                | **discouraged** |
| `effect/PubSub.PubSub.Strategy.completePollersUnsafe`     |  184 | `member`                | **discouraged** |
| `effect/PubSub.PubSub.Strategy.completeSubscribersUnsafe` |  195 | `member`                | **discouraged** |

## Optional

### `effect/PubSub.makeAtomicBounded`

- **Source:** `packages/effect/src/PubSub.ts:503`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a bounded atomic PubSub implementation with optional replay buffer.
- **Signature hint:** `declare function makeAtomicBounded<A>(capacity: number | { readonly capacity: number; readonly replay?: number | undefined; }): PubSub.Atomic<A>`
- **Import guidance:** Start from `import { PubSub } from "effect"` and use `PubSub.makeAtomicBounded`.
- **Suggested snippet:** Construct one representative value with `PubSub.makeAtomicBounded`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.makeAtomicUnbounded`

- **Source:** `packages/effect/src/PubSub.ts:541`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an unbounded atomic PubSub implementation with optional replay buffer.
- **Signature hint:** `declare function makeAtomicUnbounded<A>(options?: { readonly replay?: number | undefined; }): PubSub.Atomic<A>`
- **Import guidance:** Start from `import { PubSub } from "effect"` and use `PubSub.makeAtomicUnbounded`.
- **Suggested snippet:** Construct one representative value with `PubSub.makeAtomicUnbounded`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.PubSub`

- **Source:** `packages/effect/src/PubSub.ts:83`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace containing the low-level building blocks used by `PubSub`, including atomic implementations, backing subscriptions, replay windows, and delivery strategies.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/PubSub.PubSub`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.PubSub.Atomic`

- **Source:** `packages/effect/src/PubSub.ts:90`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Low-level atomic PubSub interface that handles the core message storage and retrieval.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/PubSub.PubSub.Atomic`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.PubSub.BackingSubscription`

- **Source:** `packages/effect/src/PubSub.ts:108`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Low-level subscription interface that handles message polling for individual subscribers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/PubSub.PubSub.BackingSubscription`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.PubSub.Subscribers`

- **Source:** `packages/effect/src/PubSub.ts:128`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tracks the pollers currently waiting on each backing subscription.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/PubSub.PubSub.Subscribers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.PubSub.ReplayWindow`

- **Source:** `packages/effect/src/PubSub.ts:139`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Interface for accessing replay buffer contents for late subscribers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/PubSub.PubSub.ReplayWindow`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.PubSub.Strategy`

- **Source:** `packages/effect/src/PubSub.ts:153`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Strategy interface defining how PubSub handles backpressure and message distribution.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/PubSub.PubSub.Strategy`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.PubSub.Strategy.shutdown`

- **Source:** `packages/effect/src/PubSub.ts:157`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Describes any finalization logic associated with this strategy.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/PubSub.PubSub.Strategy.shutdown` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.PubSub.Strategy.handleSurplus`

- **Source:** `packages/effect/src/PubSub.ts:163`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Describes how publishers should signal to subscribers that they are waiting for space to become available in the `PubSub`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/PubSub.PubSub.Strategy.handleSurplus` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/PubSub.BackPressureStrategy`

- **Source:** `packages/effect/src/PubSub.ts:2357`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the back-pressure strategy for bounded `PubSub` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { PubSub } from "effect"` and use `PubSub.BackPressureStrategy`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `PubSub.BackPressureStrategy`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/PubSub.PubSub.Strategy.onPubSubEmptySpaceUnsafe`

- **Source:** `packages/effect/src/PubSub.ts:174`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Describes how subscribers should signal to publishers waiting for space to become available in the `PubSub` that space may be available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/PubSub.PubSub.Strategy.onPubSubEmptySpaceUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/PubSub.PubSub.Strategy.completePollersUnsafe`

- **Source:** `packages/effect/src/PubSub.ts:184`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Describes how subscribers waiting for additional values from the `PubSub` should take those values and signal to publishers that they are no longer waiting for additional values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/PubSub.PubSub.Strategy.completePollersUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/PubSub.PubSub.Strategy.completeSubscribersUnsafe`

- **Source:** `packages/effect/src/PubSub.ts:195`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Describes how publishers should signal to subscribers waiting for additional values from the `PubSub` that new values are available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/PubSub.PubSub.Strategy.completeSubscribersUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

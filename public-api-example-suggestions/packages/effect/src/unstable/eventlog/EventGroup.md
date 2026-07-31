# Example Suggestions: `effect/unstable/eventlog/EventGroup`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 1 recommended, 10 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/EventGroup.isEventGroup`        |   40 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventGroup.empty`               |  193 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventGroup.EventGroup`          |   54 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventGroup.EventGroup.add`      |   63 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventGroup.EventGroup.addError` |   79 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventGroup.Any`                 |   88 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventGroup.AnyWithProps`        |   98 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventGroup.ToService`           |  106 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventGroup.Events`              |  115 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventGroup.ServicesClient`      |  124 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventGroup.ServicesServer`      |  132 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventGroup.TypeId (type)`       |   24 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventGroup.TypeId (value)`      |   32 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/eventlog/EventGroup.isEventGroup`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:40`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an event log event group.
- **Signature hint:** `declare function isEventGroup(u: unknown): u is Any`
- **Import guidance:** Start from `import { EventGroup } from "effect/unstable/eventlog"` and use `EventGroup.isEventGroup`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `EventGroup.isEventGroup` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/EventGroup.empty`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:193`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an empty event group used as the starting point for defining a group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventGroup } from "effect/unstable/eventlog"` and use `EventGroup.empty`.
- **Suggested snippet:** Construct one representative value with `EventGroup.empty`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventGroup.EventGroup`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Typed collection of event definitions that represents a portion of an event log domain.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventGroup.EventGroup`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventGroup.EventGroup.add`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:63`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an `Event` to the `EventGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventGroup.EventGroup.add` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventGroup.EventGroup.addError`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:79`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an error schema to all the events in the `EventGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventGroup.EventGroup.addError` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventGroup.Any`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:88`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased marker for an event log event group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventGroup.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventGroup.AnyWithProps`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:98`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased event group with its events record available structurally.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventGroup.AnyWithProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventGroup.ToService`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:106`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Derives the handler service markers required for all events in an event group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventGroup.ToService`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventGroup.Events`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:115`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the union of event definitions contained in an event group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventGroup.Events`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventGroup.ServicesClient`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:124`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Client-side schema services required by all events in an event group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventGroup.ServicesClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventGroup.ServicesServer`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:132`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Server-side schema services required by all events in an event group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventGroup.ServicesServer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/eventlog/EventGroup.TypeId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:24`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique type identifier used to mark event log event groups.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/eventlog/EventGroup.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventGroup.TypeId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/EventGroup.ts:32`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark event log event groups.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventGroup } from "effect/unstable/eventlog"` and use `EventGroup.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventGroup.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

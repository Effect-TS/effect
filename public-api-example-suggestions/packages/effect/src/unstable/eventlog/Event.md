# Example Suggestions: `effect/unstable/eventlog/Event`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/Event.ts`
- **Uncovered API records:** 29
- **Priorities:** 0 required, 3 recommended, 24 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind               | Priority        |
| ------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/Event.isEvent`               |   40 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/Event.make`                  |  392 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/Event.addError`              |  435 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/Event.Event`                 |   53 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.EventHandler`          |   79 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.Any`                   |   95 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.AnyWithProps`          |  112 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.ToService`             |  120 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.Tag`                   |  134 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.ErrorSchema`           |  148 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.Error`                 |  162 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.AddError`              |  171 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.PayloadSchema`         |  185 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.PayloadSchemaWithTag`  |  199 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.Payload`               |  213 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.TaggedPayload`         |  226 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.SuccessSchema`         |  243 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.Success`               |  257 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.ServicesClient`        |  270 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.ServicesServer`        |  292 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.Services`              |  310 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.WithTag`               |  330 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.ExcludeTag`            |  338 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.PayloadWithTag`        |  346 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.SuccessWithTag`        |  354 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.ErrorWithTag`          |  362 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.ServicesClientWithTag` |  371 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/Event.TypeId (type)`         |   24 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/Event.TypeId (value)`        |   32 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/eventlog/Event.isEvent`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:40`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when a value is an event log event definition.
- **Signature hint:** `declare function isEvent(u: unknown): u is Event<any, any, any, any>`
- **Import guidance:** Start from `import { Event } from "effect/unstable/eventlog"` and use `Event.isEvent`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Event.isEvent` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/Event.make`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:392`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an event log event definition.
- **Signature hint:** `declare function make<Tag extends string, Payload extends Schema.Top = Schema.Void, Success extends Schema.Top = Schema.Void, Error extends Schema.Top = Schema.Never>(options: { readonly tag: Tag; readonly primaryKey: (payload: Schema.Schema.Type<Payload>) => string; readonly payload?: Payload | undefined; readonly success?: Success | undefined; readonly error?: Error | undefined; }): Event<Tag, Payload, Success, Error>`
- **Import guidance:** Start from `import { Event } from "effect/unstable/eventlog"` and use `Event.make`.
- **Suggested snippet:** Construct one representative value with `Event.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/Event.addError`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:435`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Adds another error schema to an event definition.
- **Signature hint:** `declare function addError<A extends Any, Error2 extends Schema.Top>(event: A, error: Error2): AddError<A, Error2>`
- **Import guidance:** Start from `import { Event } from "effect/unstable/eventlog"` and use `Event.addError`.
- **Suggested snippet:** Create or capture `Event.addError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/Event.Event`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:53`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Definition of an event type that can be written to an `EventLog`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.Event`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.EventHandler`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:79`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Marker service associated with the handler for an event tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.EventHandler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.Any`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:95`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased event log event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.AnyWithProps`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:112`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-erased event definition with its runtime properties available structurally.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.AnyWithProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.ToService`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:120`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Derives the handler service marker for an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.ToService`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.Tag`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:134`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the tag string from an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.Tag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.ErrorSchema`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:148`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the error schema from an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.ErrorSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.Error`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:162`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded error value type for an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.AddError`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:171`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns an event definition type whose error schema also includes the provided error schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.AddError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.PayloadSchema`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:185`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the payload schema from an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.PayloadSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.PayloadSchemaWithTag`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:199`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the payload schema for the event in a union with the specified tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.PayloadSchemaWithTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.Payload`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:213`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded payload value type for an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.Payload`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.TaggedPayload`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:226`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tagged payload value for an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.TaggedPayload`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.SuccessSchema`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:243`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the success schema from an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.SuccessSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.Success`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:257`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded success value type for an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.ServicesClient`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:270`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema services required by a client for an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.ServicesClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.ServicesServer`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:292`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema services required by a server for an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.ServicesServer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.Services`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:310`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** All schema services required to encode and decode the payload, success, and error schemas for an event definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.WithTag`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:330`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the event definition with the specified tag from an event union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.WithTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.ExcludeTag`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:338`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Removes event definitions with the specified tag from an event union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.ExcludeTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.PayloadWithTag`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:346`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded payload value type for the event in a union with the specified tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.PayloadWithTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.SuccessWithTag`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:354`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded success value type for the event in a union with the specified tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.SuccessWithTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.ErrorWithTag`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:362`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded error value type for the event in a union with the specified tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.ErrorWithTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/Event.ServicesClientWithTag`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:371`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Client-side schema services required for the event in a union with the specified tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/Event.ServicesClientWithTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/eventlog/Event.TypeId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:24`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Unique type identifier used to mark event log event definitions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/eventlog/Event.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/Event.TypeId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/Event.ts:32`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime type identifier used to mark event log event definitions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Event } from "effect/unstable/eventlog"` and use `Event.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Event.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

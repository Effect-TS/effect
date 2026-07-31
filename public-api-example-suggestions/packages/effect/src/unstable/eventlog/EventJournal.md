# Example Suggestions: `effect/unstable/eventlog/EventJournal`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts`
- **Uncovered API records:** 28
- **Priorities:** 0 required, 10 recommended, 11 optional, 7 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                              | Line | Kind               | Priority        |
| ---------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/EventJournal.layerMemory`              |  503 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.makeIndexedDb`            |  517 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.layerIndexedDb`           |  778 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.EventJournal`             |   40 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.EventJournalError`        |  121 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.RemoteId (value)`         |  163 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.EntryId (value)`          |  213 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.Entry`                    |  275 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.RemoteEntry`              |  347 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.makeMemory`               |  363 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventJournal.RemoteId (type)`          |  155 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventJournal.EntryId (type)`           |  205 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventJournal.EntryIdOrder`             |  223 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventJournal.entryIdMillis`            |  258 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventJournal.Entry.arrayMsgpack`       |  286 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventJournal.Entry.encodeArray`        |  293 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventJournal.Entry.decodeArray`        |  300 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventJournal.Entry.Order`              |  307 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventJournal.Entry.idString`           |  314 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventJournal.Entry.createdAtMillis`    |  323 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventJournal.Entry.createdAt`          |  332 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventJournal.makeRemoteIdUnsafe`       |  181 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventJournal.makeEntryIdUnsafe`        |  249 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventJournal.EventJournalError.TypeId` |  130 | `member`           | **discouraged** |
| `effect/unstable/eventlog/EventJournal.RemoteIdTypeId (type)`    |  139 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventJournal.RemoteIdTypeId (value)`   |  147 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventJournal.EntryIdTypeId (value)`    |  189 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventJournal.EntryIdTypeId (type)`     |  197 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/eventlog/EventJournal.layerMemory`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:503`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **recommended**
- **Current description:** Layer that provides an in-memory `EventJournal`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.layerMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventJournal.layerMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventJournal.makeIndexedDb`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:517`
- **Kind / category:** `root-declaration` / `indexed db`
- **Priority:** **recommended**
- **Current description:** Creates an `EventJournal` backed by IndexedDB.
- **Signature hint:** `declare function makeIndexedDb(options?: { readonly database?: string; }): Effect.Effect<EventJournal['Service'], EventJournalError, Scope>`
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.makeIndexedDb`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventJournal.makeIndexedDb`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventJournal.layerIndexedDb`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:778`
- **Kind / category:** `root-declaration` / `indexed db`
- **Priority:** **recommended**
- **Current description:** Provides `EventJournal` using the IndexedDB-backed implementation created by `makeIndexedDb`.
- **Signature hint:** `declare function layerIndexedDb(options?: { readonly database?: string; }): Layer.Layer<EventJournal, EventJournalError>`
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.layerIndexedDb`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventJournal.layerIndexedDb`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventJournal.EventJournal`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:40`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **recommended**
- **Current description:** Context service for storing and replaying event journal entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.EventJournal`.
- **Suggested snippet:** Consume `EventJournal.EventJournal` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventJournal.EventJournalError`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:121`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised by event journal operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.EventJournalError`.
- **Suggested snippet:** Create or capture `EventJournal.EventJournalError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventJournal.RemoteId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:163`
- **Kind / category:** `root-declaration` / `remote`
- **Priority:** **recommended**
- **Current description:** Schema for branded remote event journal identifiers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.RemoteId`.
- **Suggested snippet:** Use `EventJournal.RemoteId` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventJournal.EntryId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:213`
- **Kind / category:** `root-declaration` / `entry`
- **Priority:** **recommended**
- **Current description:** Schema for branded event journal entry identifiers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.EntryId`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Schema for branded event journal entry identifiers. Call `EventJournal.EntryId` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventJournal.Entry`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:275`
- **Kind / category:** `root-declaration` / `entry`
- **Priority:** **recommended**
- **Current description:** Schema for a committed event journal entry.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.Entry`.
- **Suggested snippet:** Use `EventJournal.Entry` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventJournal.RemoteEntry`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:347`
- **Kind / category:** `root-declaration` / `entry`
- **Priority:** **recommended**
- **Current description:** Schema for an event journal entry received from a remote source.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.RemoteEntry`.
- **Suggested snippet:** Use `EventJournal.RemoteEntry` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventJournal.makeMemory`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:363`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **recommended**
- **Current description:** Creates an in-memory `EventJournal` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.makeMemory`.
- **Suggested snippet:** Construct one representative value with `EventJournal.makeMemory`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/EventJournal.RemoteId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:155`
- **Kind / category:** `root-declaration` / `remote`
- **Priority:** **optional**
- **Current description:** Branded byte identifier for a remote event journal source.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventJournal.RemoteId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.EntryId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:205`
- **Kind / category:** `root-declaration` / `entry`
- **Priority:** **optional**
- **Current description:** Branded byte identifier for an event journal entry.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventJournal.EntryId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.EntryIdOrder`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:223`
- **Kind / category:** `root-declaration` / `entry`
- **Priority:** **optional**
- **Current description:** Provides an Ordering instance for entry identifiers based on their raw UUID bytes.
- **Signature hint:** `declare function EntryIdOrder(self: EntryId, that: EntryId): Ordering`
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.EntryIdOrder`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Provides an Ordering instance for entry identifiers based on their raw UUID bytes. Call `EventJournal.EntryIdOrder` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.entryIdMillis`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:258`
- **Kind / category:** `root-declaration` / `entry`
- **Priority:** **optional**
- **Current description:** Extracts the millisecond timestamp encoded in a UUID v7 `EntryId`.
- **Signature hint:** `declare function entryIdMillis(entryId: EntryId): number`
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.entryIdMillis`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts the millisecond timestamp encoded in a UUID v7 `EntryId`. Call `EventJournal.entryIdMillis` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.Entry.arrayMsgpack`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:286`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** MessagePack schema for arrays of committed event journal entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventJournal.Entry.arrayMsgpack` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.Entry.encodeArray`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:293`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Encodes arrays of committed entries with the MessagePack entry schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventJournal.Entry.encodeArray` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.Entry.decodeArray`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:300`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Decodes arrays of committed entries with the MessagePack entry schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventJournal.Entry.decodeArray` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.Entry.Order`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:307`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Ordering for committed entries by their event journal entry id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventJournal.Entry.Order` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.Entry.idString`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:314`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** String representation of the entry id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventJournal.Entry.idString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.Entry.createdAtMillis`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:323`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creation timestamp encoded in the UUID v7 entry id, in epoch milliseconds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventJournal.Entry.createdAtMillis` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventJournal.Entry.createdAt`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:332`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creation timestamp encoded in the UUID v7 entry id, as a UTC date-time.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventJournal.Entry.createdAt` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/eventlog/EventJournal.makeRemoteIdUnsafe`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:181`
- **Kind / category:** `root-declaration` / `remote`
- **Priority:** **discouraged**
- **Current description:** Generates a new random `RemoteId`.
- **Signature hint:** `declare function makeRemoteIdUnsafe(): RemoteId`
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.makeRemoteIdUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventJournal.makeRemoteIdUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventJournal.makeEntryIdUnsafe`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:249`
- **Kind / category:** `root-declaration` / `entry`
- **Priority:** **discouraged**
- **Current description:** Generates a UUID v7 `EntryId`, optionally using the supplied millisecond timestamp.
- **Signature hint:** `declare function makeEntryIdUnsafe(options?: { msecs?: number; }): EntryId`
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.makeEntryIdUnsafe`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventJournal.makeEntryIdUnsafe` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventJournal.EventJournalError.TypeId`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:130`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an event journal error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/eventlog/EventJournal.EventJournalError.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventJournal.RemoteIdTypeId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:139`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Brand identifier used for `RemoteId` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/eventlog/EventJournal.RemoteIdTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventJournal.RemoteIdTypeId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:147`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime brand identifier used for `RemoteId` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.RemoteIdTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventJournal.RemoteIdTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventJournal.EntryIdTypeId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:189`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime brand identifier used for `EntryId` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventJournal } from "effect/unstable/eventlog"` and use `EventJournal.EntryIdTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventJournal.EntryIdTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventJournal.EntryIdTypeId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventJournal.ts:197`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Brand identifier used for `EntryId` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/eventlog/EventJournal.EntryIdTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

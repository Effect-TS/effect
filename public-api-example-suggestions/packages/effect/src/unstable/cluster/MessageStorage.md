# Example Suggestions: `effect/unstable/cluster/MessageStorage`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts`
- **Uncovered API records:** 34
- **Priorities:** 0 required, 7 recommended, 27 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                      | Line | Kind                    | Priority        |
| ------------------------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/unstable/cluster/MessageStorage.layerNoop`                       | 1044 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/MessageStorage.layerMemory`                     | 1052 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/MessageStorage.MessageStorage`                  |   48 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/MessageStorage.make`                            |  452 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/MessageStorage.makeEncoded`                     |  562 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/MessageStorage.noop`                            |  772 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/MessageStorage.MemoryDriver`                    |  828 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/MessageStorage.SaveResult (type)`               |  186 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/MessageStorage.SaveResult (value)`              |  194 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/MessageStorage.SaveResultEncoded`               |  203 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded`                         |  290 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/MessageStorage.EncodedUnprocessedOptions`       |  418 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/MessageStorage.EncodedRepliesOptions`           |  435 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/MessageStorage.MemoryEntry`                     |  799 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/MessageStorage.MemoryTransaction`               |  812 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/MessageStorage.SaveResult (type)`               |  210 | `namespace`             | **optional**    |
| `effect/unstable/cluster/MessageStorage.SaveResult.Encoded`              |  222 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/MessageStorage.SaveResult.Success`              |  230 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/MessageStorage.SaveResult.Duplicate`            |  245 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/MessageStorage.SaveResult.DuplicateEncoded`     |  262 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/MessageStorage.SaveResult.Constructor`          |  274 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.saveEnvelope`            |  294 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.saveReply`               |  305 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.clearReplies`            |  310 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.requestIdForPrimaryKey`  |  315 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.repliesFor`              |  329 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.repliesForUnfiltered`    |  337 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.unprocessedMessages`     |  353 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.unprocessedMessagesById` |  367 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.resetAddress`            |  381 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.clearAddress`            |  388 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.resetShards`             |  395 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.Encoded.withTransaction`         |  402 | `member`                | **optional**    |
| `effect/unstable/cluster/MessageStorage.MemoryDriver.layer`              | 1033 | `member`                | **optional**    |

## Recommended

### `effect/unstable/cluster/MessageStorage.layerNoop`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:1044`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the no-op `MessageStorage` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.layerNoop`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `MessageStorage.layerNoop`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/MessageStorage.layerMemory`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:1052`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides in-memory message storage and its backing `MemoryDriver`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.layerMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `MessageStorage.layerMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/MessageStorage.MessageStorage`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:48`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **recommended**
- **Current description:** Service for cluster mailbox persistence and reply delivery.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.MessageStorage`.
- **Suggested snippet:** Consume `MessageStorage.MessageStorage` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/MessageStorage.make`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:452`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Wraps a concrete message storage implementation with reply-handler management.
- **Signature hint:** `declare function make(storage: Omit<MessageStorage['Service'], 'registerReplyHandler' | 'unregisterReplyHandler' | 'unregisterShardReplyHandlers'>): Effect.Effect<MessageStorage['Service']>`
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `MessageStorage.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/MessageStorage.makeEncoded`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:562`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a `MessageStorage` service from an encoded storage driver.
- **Signature hint:** `declare function makeEncoded(encoded: Encoded): Effect.Effect<MessageStorage['Service'], never, Snowflake.Generator>`
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.makeEncoded`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `MessageStorage.makeEncoded`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/MessageStorage.noop`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:772`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** No-op `MessageStorage` service that does not persist messages or replies.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.noop`.
- **Suggested snippet:** Use `MessageStorage.noop` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/MessageStorage.MemoryDriver`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:828`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **recommended**
- **Current description:** Service that provides an in-memory message storage driver with inspectable backing state.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.MemoryDriver`.
- **Suggested snippet:** Consume `MessageStorage.MemoryDriver` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/MessageStorage.SaveResult (type)`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:186`
- **Kind / category:** `root-declaration` / `SaveResult`
- **Priority:** **optional**
- **Current description:** Result of saving a request or envelope into message storage.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.SaveResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.SaveResult (value)`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:194`
- **Kind / category:** `root-declaration` / `SaveResult`
- **Priority:** **optional**
- **Current description:** Constructors and matchers for decoded save results.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.SaveResult`.
- **Suggested snippet:** Use `MessageStorage.SaveResult` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.SaveResultEncoded`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:203`
- **Kind / category:** `root-declaration` / `SaveResult`
- **Priority:** **optional**
- **Current description:** Constructors and matchers for encoded save results returned by storage drivers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.SaveResultEncoded`.
- **Suggested snippet:** Use `MessageStorage.SaveResultEncoded` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:290`
- **Kind / category:** `root-declaration` / `Encoded`
- **Priority:** **optional**
- **Current description:** Low-level storage-driver contract for encoded envelopes and replies.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.EncodedUnprocessedOptions`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:418`
- **Kind / category:** `root-declaration` / `Encoded`
- **Priority:** **optional**
- **Current description:** Cursor options for reading encoded unprocessed messages across shard sets.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.EncodedUnprocessedOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.EncodedRepliesOptions`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:435`
- **Kind / category:** `root-declaration` / `Encoded`
- **Priority:** **optional**
- **Current description:** Cursor options for reading encoded replies across request sets.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.EncodedRepliesOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.MemoryEntry`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:799`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** In-memory storage entry for a request envelope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.MemoryEntry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.MemoryTransaction`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:812`
- **Kind / category:** `root-declaration` / `memory`
- **Priority:** **optional**
- **Current description:** Provides a context reference used in tests to simulate a transaction.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { MessageStorage } from "effect/unstable/cluster"` and use `MessageStorage.MemoryTransaction`.
- **Suggested snippet:** Consume `MessageStorage.MemoryTransaction` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.SaveResult (type)`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:210`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Variants and helper types for `SaveResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.SaveResult`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.SaveResult.Encoded`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:222`
- **Kind / category:** `namespace-declaration` / `SaveResult`
- **Priority:** **optional**
- **Current description:** Encoded storage-driver form of `SaveResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.SaveResult.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.SaveResult.Success`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:230`
- **Kind / category:** `namespace-declaration` / `SaveResult`
- **Priority:** **optional**
- **Current description:** Variant indicating that the message was saved as a new storage entry.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.SaveResult.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.SaveResult.Duplicate`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:245`
- **Kind / category:** `namespace-declaration` / `SaveResult`
- **Priority:** **optional**
- **Current description:** Variant indicating that the request duplicates an existing stored request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.SaveResult.Duplicate`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.SaveResult.DuplicateEncoded`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:262`
- **Kind / category:** `namespace-declaration` / `SaveResult`
- **Priority:** **optional**
- **Current description:** Encoded duplicate-save variant returned by lower-level storage drivers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.SaveResult.DuplicateEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.SaveResult.Constructor`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:274`
- **Kind / category:** `namespace-declaration` / `SaveResult`
- **Priority:** **optional**
- **Current description:** Generic tagged enum constructor type for `SaveResult`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/MessageStorage.SaveResult.Constructor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.saveEnvelope`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:294`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Save the provided message and its associated metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.saveEnvelope` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.saveReply`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:305`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Save the provided `Reply` and its associated metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.saveReply` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.clearReplies`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:310`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Remove the replies for the specified request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.clearReplies` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.requestIdForPrimaryKey`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:315`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Retrieves the request id for the specified primary key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.requestIdForPrimaryKey` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.repliesFor`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:329`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Retrieves the replies for the specified requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.repliesFor` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.repliesForUnfiltered`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:337`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Retrieves the replies for the specified request ids.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.repliesForUnfiltered` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.unprocessedMessages`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:353`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Retrieves the unprocessed messages for the given shards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.unprocessedMessages` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.unprocessedMessagesById`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:367`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Retrieves the unprocessed messages by id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.unprocessedMessagesById` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.resetAddress`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:381`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Reset the mailbox state for the provided address.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.resetAddress` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.clearAddress`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:388`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Clear all messages and replies for the provided address.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.clearAddress` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.resetShards`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:395`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Reset the mailbox state for the provided shards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.resetShards` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.Encoded.withTransaction`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:402`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Used to wrap requests with transactions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.Encoded.withTransaction` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/MessageStorage.MemoryDriver.layer`

- **Source:** `packages/effect/src/unstable/cluster/MessageStorage.ts:1033`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Layer that provides the in-memory message storage driver.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/MessageStorage.MemoryDriver.layer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

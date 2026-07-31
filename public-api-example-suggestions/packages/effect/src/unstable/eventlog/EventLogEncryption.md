# Example Suggestions: `effect/unstable/eventlog/EventLogEncryption`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/EventLogEncryption.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 2 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                              | Line | Kind               | Priority        |
| -------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/EventLogEncryption.EventLogEncryption`                 |   75 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogEncryption.makeEncryptionSubtle`               |   99 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogEncryption.layerSubtle`                        |  166 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogEncryption.EncryptedEntry`                     |   28 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogEncryption.EncryptedRemoteEntry (type) (type)` |   40 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogEncryption.EncryptedRemoteEntry (type) (type)` |   48 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/eventlog/EventLogEncryption.EventLogEncryption`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogEncryption.ts:75`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that provides identity generation, entry encryption and decryption, and SHA-256 hashing for event-log replication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogEncryption } from "effect/unstable/eventlog"` and use `EventLogEncryption.EventLogEncryption`.
- **Suggested snippet:** Consume `EventLogEncryption.EventLogEncryption` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogEncryption.makeEncryptionSubtle`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogEncryption.ts:99`
- **Kind / category:** `root-declaration` / `encryption`
- **Priority:** **recommended**
- **Current description:** Creates an `EventLogEncryption` service backed by the Web Crypto `SubtleCrypto` APIs from the supplied `Crypto` implementation.
- **Signature hint:** `declare function makeEncryptionSubtle(crypto: Crypto): Effect.Effect<EventLogEncryption['Service']>`
- **Import guidance:** Start from `import { EventLogEncryption } from "effect/unstable/eventlog"` and use `EventLogEncryption.makeEncryptionSubtle`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogEncryption.makeEncryptionSubtle`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/EventLogEncryption.layerSubtle`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogEncryption.ts:166`
- **Kind / category:** `root-declaration` / `encryption`
- **Priority:** **optional**
- **Current description:** Provides `EventLogEncryption` using `globalThis.crypto`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogEncryption } from "effect/unstable/eventlog"` and use `EventLogEncryption.layerSubtle`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogEncryption.layerSubtle`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogEncryption.EncryptedEntry`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogEncryption.ts:28`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for an encrypted journal entry paired with the id of the original entry.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogEncryption } from "effect/unstable/eventlog"` and use `EventLogEncryption.EncryptedEntry`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `EventLogEncryption.EncryptedEntry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogEncryption.EncryptedRemoteEntry (type) (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogEncryption.ts:40`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type of an encrypted remote entry, including its remote sequence number, initialization vector, entry id, and encrypted entry bytes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLogEncryption.EncryptedRemoteEntry (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogEncryption.EncryptedRemoteEntry (type) (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogEncryption.ts:48`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for encrypted entries exchanged with a remote event-log server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogEncryption } from "effect/unstable/eventlog"` and use `EventLogEncryption.EncryptedRemoteEntry`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `EventLogEncryption.EncryptedRemoteEntry`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

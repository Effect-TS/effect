# Example Suggestions: `effect/unstable/eventlog/EventLogMessage`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts`
- **Uncovered API records:** 20
- **Priorities:** 0 required, 1 recommended, 4 optional, 15 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/EventLogMessage.StoreId (value)`         |   53 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogMessage.StoreId (type)`          |   45 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogMessage.EventLogAuthentication`  |   83 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogMessage.ChunkedMessage.split`    |  190 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventLogMessage.ChunkedMessage.join`     |  210 | `member`           | **optional**    |
| `effect/unstable/eventlog/EventLogMessage.StoreIdTypeId (type)`    |   29 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.StoreIdTypeId (value)`   |   37 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.EventLogProtocolError`   |   66 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.HelloResponse`           |  100 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.HelloRpc`                |  111 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.Authenticate`            |  123 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.AuthenticateRpc`         |  136 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.SingleMessage`           |  147 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.ChunkedMessage`          |  164 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.WriteChunkedRpc`         |  254 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.WriteEntries`            |  270 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.WriteEntriesUnencrypted` |  290 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.WriteSingleRpc`          |  311 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.ChangesRpc`              |  330 | `root-declaration` | **discouraged** |
| `effect/unstable/eventlog/EventLogMessage.EventLogRemoteRpcs`      |  355 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/eventlog/EventLogMessage.StoreId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:53`
- **Kind / category:** `root-declaration` / `StoreId`
- **Priority:** **recommended**
- **Current description:** Schema for branded event-log store ids.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.StoreId`.
- **Suggested snippet:** Use `EventLogMessage.StoreId` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/EventLogMessage.StoreId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:45`
- **Kind / category:** `root-declaration` / `StoreId`
- **Priority:** **optional**
- **Current description:** Branded string identifying a logical event-log store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLogMessage.StoreId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogMessage.EventLogAuthentication`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:83`
- **Kind / category:** `root-declaration` / `middleware`
- **Priority:** **optional**
- **Current description:** RPC middleware that authenticates event-log requests and provides the client `Identity` to authenticated handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.EventLogAuthentication`.
- **Suggested snippet:** Use `EventLogMessage.EventLogAuthentication` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogMessage.ChunkedMessage.split`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:190`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Splits binary event-log message data into numbered chunks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventLogMessage.ChunkedMessage.split` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogMessage.ChunkedMessage.join`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:210`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Reassembles all chunks for a message id into the original binary payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventLogMessage.ChunkedMessage.join` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/eventlog/EventLogMessage.StoreIdTypeId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:29`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to brand event-log store ids.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/eventlog/EventLogMessage.StoreIdTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.StoreIdTypeId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:37`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime brand identifier for event-log store ids.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.StoreIdTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.StoreIdTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.EventLogProtocolError`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:66`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Error returned by event-log remote RPCs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.EventLogProtocolError`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.EventLogProtocolError` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.HelloResponse`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:100`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Response sent by the remote server during the authentication handshake.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.HelloResponse`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.HelloResponse` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.HelloRpc`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:111`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC used to start an event-log remote session and receive a `HelloResponse`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.HelloRpc`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.HelloRpc` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.Authenticate`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:123`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Schema for an authentication request containing the client public key, Ed25519 signing public key, signature over the session challenge payload, and algorithm name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.Authenticate`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.Authenticate` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.AuthenticateRpc`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:136`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC used to authenticate a remote event-log session after `HelloRpc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.AuthenticateRpc`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.AuthenticateRpc` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.SingleMessage`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:147`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Represents an entire encoded event-log payload in one transport frame.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.SingleMessage`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.SingleMessage` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.ChunkedMessage`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:164`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Represents one part of a large encoded event-log payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.ChunkedMessage`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.ChunkedMessage` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.WriteChunkedRpc`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:254`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC used to send one chunk of a large encoded write payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.WriteChunkedRpc`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.WriteChunkedRpc` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.WriteEntries`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:270`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Schema for encrypted event-log write payloads sent to a remote store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.WriteEntries`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.WriteEntries` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.WriteEntriesUnencrypted`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:290`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Schema for plaintext event-log write payloads sent to a remote store.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.WriteEntriesUnencrypted`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.WriteEntriesUnencrypted` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.WriteSingleRpc`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:311`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC used to send an encoded write payload that fits in one message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.WriteSingleRpc`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.WriteSingleRpc` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.ChangesRpc`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:330`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC used to stream remote event-log changes for a public key and store id starting at a sequence number.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.ChangesRpc`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.ChangesRpc` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLogMessage.EventLogRemoteRpcs`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogMessage.ts:355`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC group containing the event-log remote handshake, authentication, write, and changes endpoints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogMessage } from "effect/unstable/eventlog"` and use `EventLogMessage.EventLogRemoteRpcs`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLogMessage.EventLogRemoteRpcs` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

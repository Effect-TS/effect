# Example Suggestions: `effect/unstable/cluster/Message`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/Message.ts`
- **Uncovered API records:** 15
- **Priorities:** 0 required, 5 recommended, 10 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind               | Priority        |
| -------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/Message.IncomingRequest`              |   89 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Message.serialize`                    |  212 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Message.serializeEnvelope`            |  235 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Message.serializeRequest`             |  254 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Message.deserializeLocal`             |  280 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Message.IncomingEnvelope`             |  119 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Message.Incoming`                     |   37 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Message.IncomingLocal`                |   49 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Message.incomingLocalFromOutgoing`    |   62 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Message.IncomingRequestLocal`         |  106 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Message.Outgoing`                     |  134 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Message.OutgoingRequest`              |  147 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Message.OutgoingEnvelope`             |  174 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Message.OutgoingRequest.encodedCache` |  160 | `member`           | **optional**    |
| `effect/unstable/cluster/Message.OutgoingEnvelope.interrupt`   |  183 | `member`           | **optional**    |

## Recommended

### `effect/unstable/cluster/Message.IncomingRequest`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:89`
- **Kind / category:** `root-declaration` / `incoming`
- **Priority:** **recommended**
- **Current description:** Represents an incoming persisted request whose payload has not yet been decoded with the RPC schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.IncomingRequest`.
- **Suggested snippet:** Use `Message.IncomingRequest` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Message.serialize`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:212`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Serializes an outgoing message into a partial envelope.
- **Signature hint:** `declare function serialize<Rpc extends Rpc.Any>(message: Outgoing<Rpc>): Effect.Effect<Envelope.Partial, MalformedMessage>`
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.serialize`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Message.serialize`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Message.serializeEnvelope`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:235`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Serializes an outgoing message into its JSON envelope representation.
- **Signature hint:** `declare function serializeEnvelope<Rpc extends Rpc.Any>(message: Outgoing<Rpc>): Effect.Effect<Envelope.Encoded, MalformedMessage, never>`
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.serializeEnvelope`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Message.serializeEnvelope`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Message.serializeRequest`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:254`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Encodes the payload of an `OutgoingRequest` with the request's RPC payload schema and service context.
- **Signature hint:** `declare function serializeRequest<Rpc extends Rpc.Any>(self: OutgoingRequest<Rpc>): Effect.Effect<Envelope.PartialRequest, MalformedMessage>`
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.serializeRequest`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Message.serializeRequest`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Message.deserializeLocal`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:280`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Decodes a partial envelope back into a locally deliverable incoming message.
- **Signature hint:** `declare function deserializeLocal<Rpc extends Rpc.Any>(self: Outgoing<Rpc>, encoded: Envelope.Partial): Effect.Effect<IncomingLocal<Rpc>, MalformedMessage>`
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.deserializeLocal`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Message.deserializeLocal`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/Message.IncomingEnvelope`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:119`
- **Kind / category:** `root-declaration` / `incoming`
- **Priority:** **optional**
- **Current description:** Represents an incoming control envelope carrying an `AckChunk` or `Interrupt`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.IncomingEnvelope`.
- **Suggested snippet:** Use `Message.IncomingEnvelope` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Message.Incoming`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:37`
- **Kind / category:** `root-declaration` / `incoming`
- **Priority:** **optional**
- **Current description:** Message read by a runner from storage or transport.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Message.Incoming`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Message.IncomingLocal`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:49`
- **Kind / category:** `root-declaration` / `incoming`
- **Priority:** **optional**
- **Current description:** Locally decoded incoming message for in-process delivery.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Message.IncomingLocal`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Message.incomingLocalFromOutgoing`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:62`
- **Kind / category:** `root-declaration` / `incoming`
- **Priority:** **optional**
- **Current description:** Converts an outgoing message into a locally deliverable incoming message.
- **Signature hint:** `declare function incomingLocalFromOutgoing<R extends Rpc.Any>(self: Outgoing<R>): IncomingLocal<R>`
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.incomingLocalFromOutgoing`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts an outgoing message into a locally deliverable incoming message. Call `Message.incomingLocalFromOutgoing` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Message.IncomingRequestLocal`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:106`
- **Kind / category:** `root-declaration` / `incoming`
- **Priority:** **optional**
- **Current description:** Represents an incoming request for local delivery with a decoded payload.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.IncomingRequestLocal`.
- **Suggested snippet:** Use `Message.IncomingRequestLocal` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Message.Outgoing`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:134`
- **Kind / category:** `root-declaration` / `outgoing`
- **Priority:** **optional**
- **Current description:** Message produced for storage or transport.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Message.Outgoing`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Message.OutgoingRequest`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:147`
- **Kind / category:** `root-declaration` / `outgoing`
- **Priority:** **optional**
- **Current description:** Represents an outgoing entity request with decoded payload and RPC metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.OutgoingRequest`.
- **Suggested snippet:** Use `Message.OutgoingRequest` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Message.OutgoingEnvelope`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:174`
- **Kind / category:** `root-declaration` / `outgoing`
- **Priority:** **optional**
- **Current description:** Represents an outgoing control envelope paired with RPC metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Message } from "effect/unstable/cluster"` and use `Message.OutgoingEnvelope`.
- **Suggested snippet:** Use `Message.OutgoingEnvelope` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Message.OutgoingRequest.encodedCache`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:160`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Cached encoded envelope payload reused when sending the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Message.OutgoingRequest.encodedCache` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Message.OutgoingEnvelope.interrupt`

- **Source:** `packages/effect/src/unstable/cluster/Message.ts:183`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates an outgoing interrupt envelope for the supplied request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Message.OutgoingEnvelope.interrupt` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

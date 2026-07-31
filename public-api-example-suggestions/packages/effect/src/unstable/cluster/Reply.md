# Example Suggestions: `effect/unstable/cluster/Reply`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/Reply.ts`
- **Uncovered API records:** 26
- **Priorities:** 0 required, 5 recommended, 19 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind               | Priority        |
| ----------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/Reply.isReply`                     |   40 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Reply.Encoded (value)`             |   69 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Reply.Reply (value)`               |  402 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Reply.serialize`                   |  426 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Reply.serializeLastReceived`       |  446 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Reply.Reply (type)`                |   49 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Reply.Encoded (type)`              |   57 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Reply.ReplyWithContext`            |   83 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Reply.ReplyWithContext.fromDefect` |   93 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.ReplyWithContext.interrupt`  |  113 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.WithExitEncoded`             |  142 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Reply.ChunkEncoded`                |  156 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Reply.Chunk`                       |  173 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Reply.Chunk.emptyFrom`             |  191 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.Chunk.Any`                   |  205 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.Chunk.transform`             |  212 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.Chunk.schema`                |  222 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.Chunk.schemaFrom`            |  237 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.Chunk.withRequestId`         |  278 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.WithExit`                    |  298 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Reply.WithExit.is`                 |  315 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.WithExit.schema`             |  324 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.WithExit.schemaFrom`         |  339 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.WithExit.withRequestId`      |  387 | `member`           | **optional**    |
| `effect/unstable/cluster/Reply.Chunk.TypeId`                |  184 | `member`           | **discouraged** |
| `effect/unstable/cluster/Reply.WithExit.TypeId`             |  308 | `member`           | **discouraged** |

## Recommended

### `effect/unstable/cluster/Reply.isReply`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:40`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when the supplied value is a runtime cluster reply, based on the reply type identifier.
- **Signature hint:** `declare function isReply(u: unknown): u is Reply<Rpc.Any>`
- **Import guidance:** Start from `import { Reply } from "effect/unstable/cluster"` and use `Reply.isReply`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Reply.isReply` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Reply.Encoded (value)`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:69`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for reply values that are already in encoded form.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Reply } from "effect/unstable/cluster"` and use `Reply.Encoded`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Reply.Encoded`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Reply.Reply (value)`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:402`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Builds the transport codec for replies to the specified RPC, covering terminal `WithExit` replies and streaming `Chunk` replies.
- **Signature hint:** `declare function Reply<R extends Rpc.Any>(rpc: R): Schema.Codec<WithExit<R> | Chunk<R>, Encoded, Rpc.ServicesServer<R>, Rpc.ServicesClient<R>>`
- **Import guidance:** Start from `import { Reply } from "effect/unstable/cluster"` and use `Reply.Reply`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds the transport codec for replies to the specified RPC, covering terminal `WithExit` replies and streaming `Chunk` replies. Call `Reply.Reply` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Reply.serialize`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:426`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Serializes a `ReplyWithContext` into its encoded wire representation, using the reply's RPC schema and context and refailing encoding errors as `MalformedMessage`.
- **Signature hint:** `declare function serialize<R extends Rpc.Any>(self: ReplyWithContext<R>): Effect.Effect<Encoded, MalformedMessage>`
- **Import guidance:** Start from `import { Reply } from "effect/unstable/cluster"` and use `Reply.serialize`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Reply.serialize`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Reply.serializeLastReceived`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:446`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Serializes an outgoing request's last received reply when one exists, returning `None` when no reply has been received and refailing encoding errors as `MalformedMessage`.
- **Signature hint:** `declare function serializeLastReceived<R extends Rpc.Any>(self: OutgoingRequest<R>): Effect.Effect<Option.Option<Encoded>, MalformedMessage>`
- **Import guidance:** Start from `import { Reply } from "effect/unstable/cluster"` and use `Reply.serializeLastReceived`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Reply.serializeLastReceived`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/Reply.Reply (type)`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:49`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Runtime reply sent for an RPC request, either as a final exit or a chunk of a streaming success value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Reply.Reply`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.Encoded (type)`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:57`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** JSON-serializable form of a cluster reply.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Reply.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.ReplyWithContext`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:83`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a cluster reply paired with the RPC definition and service context required to serialize it for transport.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Reply } from "effect/unstable/cluster"` and use `Reply.ReplyWithContext`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Reply.ReplyWithContext`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.ReplyWithContext.fromDefect`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:93`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a terminal reply context that dies with the supplied defect.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.ReplyWithContext.fromDefect` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.ReplyWithContext.interrupt`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:113`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a terminal reply context that interrupts the supplied request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.ReplyWithContext.interrupt` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.WithExitEncoded`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:142`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Wire-format representation of a terminal reply containing the request id, reply id, and encoded RPC exit value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Reply.WithExitEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.ChunkEncoded`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:156`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Wire-format representation of a streaming reply chunk, including the request id, reply id, sequence number, and non-empty encoded values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Reply.ChunkEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.Chunk`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:173`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a streaming RPC reply chunk for a request, carrying a non-empty batch of success values together with the reply id and sequence number.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Reply } from "effect/unstable/cluster"` and use `Reply.Chunk`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Reply.Chunk`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.Chunk.emptyFrom`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:191`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates an empty chunk reply for the supplied request id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.Chunk.emptyFrom` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.Chunk.Any`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:205`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Schema that accepts any runtime chunk reply without validating payload values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.Chunk.Any` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.Chunk.transform`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:212`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Transformation between encoded chunk records and `Chunk` instances.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.Chunk.transform` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.Chunk.schema`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:222`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds a chunk schema from the streaming success schema of an RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.Chunk.schema` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.Chunk.schemaFrom`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:237`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds a chunk schema that validates each success value with the supplied schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.Chunk.schemaFrom` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.Chunk.withRequestId`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:278`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a copy of this chunk associated with the supplied request id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.Chunk.withRequestId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.WithExit`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:298`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a terminal RPC reply for a request, carrying the final `Exit` for the remote call.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Reply } from "effect/unstable/cluster"` and use `Reply.WithExit`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Reply.WithExit`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.WithExit.is`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:315`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns `true` when the value is a terminal `WithExit` reply.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.WithExit.is` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.WithExit.schema`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:324`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds a terminal reply schema from the exit schema of an RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.WithExit.schema` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.WithExit.schemaFrom`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:339`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Builds a terminal reply schema that validates the encoded exit value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.WithExit.schemaFrom` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Reply.WithExit.withRequestId`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:387`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a copy of this terminal reply associated with the supplied request id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Reply.WithExit.withRequestId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/Reply.Chunk.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:184`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a runtime cluster reply.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/Reply.Chunk.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/Reply.WithExit.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/Reply.ts:308`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a runtime cluster reply.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/Reply.WithExit.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

# Example Suggestions: `effect/unstable/cluster/Envelope`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts`
- **Uncovered API records:** 29
- **Priorities:** 0 required, 4 recommended, 22 optional, 3 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind                    | Priority        |
| ---------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/cluster/Envelope.Partial (value)`         |  264 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Envelope.PartialArray`            |  297 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Envelope.Envelope`                |  372 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Envelope.Request`                 |  382 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Envelope.Partial (type)`          |  278 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.PartialJson`             |  286 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.isEnvelope`              |  326 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.makeRequest`             |  338 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.RequestTransform`        |  394 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.primaryKey`              |  409 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.primaryKeyByAddress`     |  427 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.Envelope (type) (type)`  |   41 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.Encoded`                 |   49 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.Envelope (type) (type)`  |   56 | `namespace`             | **optional**    |
| `effect/unstable/cluster/Envelope.Envelope.Any`            |   63 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/Envelope.Request (type) (type)`   |   77 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.PartialRequest`          |  101 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.PartialRequestEncoded`   |  124 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.AckChunk`                |  154 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.AckChunk.withRequestId`  |  173 | `member`                | **optional**    |
| `effect/unstable/cluster/Envelope.AckChunkEncoded`         |  187 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.Interrupt`               |  208 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.Interrupt.withRequestId` |  226 | `member`                | **optional**    |
| `effect/unstable/cluster/Envelope.InterruptEncoded`        |  240 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Envelope.Request (type) (type)`   |  306 | `namespace`             | **optional**    |
| `effect/unstable/cluster/Envelope.Request.Any`             |  313 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/Envelope.TypeId`                  |   28 | `root-declaration`      | **discouraged** |
| `effect/unstable/cluster/Envelope.AckChunk.TypeId`         |  166 | `member`                | **discouraged** |
| `effect/unstable/cluster/Envelope.Interrupt.TypeId`        |  219 | `member`                | **discouraged** |

## Recommended

### `effect/unstable/cluster/Envelope.Partial (value)`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:264`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for partially decoded cluster envelopes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.Partial`.
- **Suggested snippet:** Use `Envelope.Partial` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Envelope.PartialArray`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:297`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for mutable arrays of JSON-encoded partial cluster envelopes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.PartialArray`.
- **Suggested snippet:** Use `Envelope.PartialArray` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Envelope.Envelope`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:372`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Schema for runtime cluster envelopes recognized by their type identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.Envelope`.
- **Suggested snippet:** Use `Envelope.Envelope` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Envelope.Request`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:382`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Schema for runtime request envelopes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.Request`.
- **Suggested snippet:** Use `Envelope.Request` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/Envelope.Partial (type)`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:278`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Decoded value type produced by the `Partial` envelope schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.Partial`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.PartialJson`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:286`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** JSON codec for partial cluster envelopes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.PartialJson`.
- **Suggested snippet:** Use `Envelope.PartialJson` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.isEnvelope`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:326`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when the supplied value is a runtime cluster envelope.
- **Signature hint:** `declare function isEnvelope(u: unknown): u is Envelope<any>`
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.isEnvelope`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Envelope.isEnvelope` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.makeRequest`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:338`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a runtime request envelope and attaches the envelope type identifier.
- **Signature hint:** `declare function makeRequest<Rpc extends Rpc.Any>(options: { readonly requestId: Snowflake; readonly address: EntityAddress; readonly tag: Rpc.Tag<Rpc>; readonly payload: Rpc.Payload<Rpc>; readonly headers: Headers.Headers; readonly traceId?: string | undefined; readonly spanId?: string | undefined; readonly sampled?: boolean | undefined; }): Request<Rpc>`
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.makeRequest`.
- **Suggested snippet:** Construct one representative value with `Envelope.makeRequest`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.RequestTransform`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:394`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **optional**
- **Current description:** Transforms plain request data with `makeRequest` and encodes request envelopes back to their raw representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.RequestTransform`.
- **Suggested snippet:** Use `Envelope.RequestTransform` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.primaryKey`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:409`
- **Kind / category:** `root-declaration` / `primary key`
- **Priority:** **optional**
- **Current description:** Returns the storage primary key for a request envelope whose payload has a primary key, or `null` when the envelope is not a keyed request.
- **Signature hint:** `declare function primaryKey<R extends Rpc.Any>(envelope: Envelope<R>): string | null`
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.primaryKey`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the storage primary key for a request envelope whose payload has a primary key, or `null` when the envelope is not a keyed request. Call `Envelope.primaryKey` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.primaryKeyByAddress`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:427`
- **Kind / category:** `root-declaration` / `primary key`
- **Priority:** **optional**
- **Current description:** Builds a storage primary-key string from an entity address, RPC tag, and payload primary-key ID.
- **Signature hint:** `declare function primaryKeyByAddress(options: { readonly address: EntityAddress; readonly tag: string; readonly id: string; }): string`
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.primaryKeyByAddress`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds a storage primary-key string from an entity address, RPC tag, and payload primary-key ID. Call `Envelope.primaryKeyByAddress` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.Envelope (type) (type)`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:41`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of cluster envelopes exchanged for an RPC request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.Envelope (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.Encoded`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:49`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** JSON-serializable form of a cluster envelope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.Envelope (type) (type)`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:56`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Helper types associated with cluster envelopes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.Envelope (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.Envelope.Any`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:63`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Envelope type for any RPC protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.Envelope.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.Request (type) (type)`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:77`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Runtime envelope for an RPC request addressed to a specific entity.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.Request (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.PartialRequest`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:101`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for a request envelope before its RPC payload has been decoded.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.PartialRequest`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Envelope.PartialRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.PartialRequestEncoded`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:124`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Serialized JSON shape of a request envelope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.PartialRequestEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.AckChunk`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:154`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an envelope acknowledging receipt of a streamed reply chunk for a request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.AckChunk`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Envelope.AckChunk`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.AckChunk.withRequestId`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:173`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a copy of this acknowledgement associated with the supplied request id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Envelope.AckChunk.withRequestId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.AckChunkEncoded`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:187`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Serialized JSON shape of an `AckChunk` envelope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.AckChunkEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.Interrupt`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:208`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an envelope used to interrupt an in-flight entity request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.Interrupt`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Envelope.Interrupt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.Interrupt.withRequestId`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:226`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a copy of this interrupt associated with the supplied request id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Envelope.Interrupt.withRequestId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.InterruptEncoded`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:240`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Serialized JSON shape of an `Interrupt` envelope.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.InterruptEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.Request (type) (type)`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:306`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Helper types associated with request envelopes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.Request (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Envelope.Request.Any`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:313`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Request envelope type for any RPC protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Envelope.Request.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/Envelope.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:28`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type identifier used to mark runtime cluster envelope values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Envelope } from "effect/unstable/cluster"` and use `Envelope.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Envelope.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/Envelope.AckChunk.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:166`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster envelope for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/Envelope.AckChunk.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/Envelope.Interrupt.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/Envelope.ts:219`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster envelope for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/Envelope.Interrupt.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

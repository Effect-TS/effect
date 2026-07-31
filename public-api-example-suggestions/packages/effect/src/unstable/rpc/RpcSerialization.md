# Example Suggestions: `effect/unstable/rpc/RpcSerialization`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts`
- **Uncovered API records:** 19
- **Priorities:** 0 required, 13 recommended, 6 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/rpc/RpcSerialization.layerJson`                   |  577 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.layerNdjson`                 |  591 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.layerNdjsonWith`             |  599 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.layerJsonRpc`                |  608 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.layerNdJsonRpc`              |  619 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.layerMsgPack`                |  635 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.layerMsgPackWith`            |  643 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.RpcSerialization`            |   33 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.MaxBufferSizeExceeded`       |   58 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.makeNdjson`                  |  117 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.jsonRpc`                     |  181 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.ndJsonRpc`                   |  215 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.makeMsgPack`                 |  506 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcSerialization.Parser`                      |   46 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcSerialization.StreamOptions`               |   72 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcSerialization.json`                        |   95 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcSerialization.ndjson`                      |  172 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcSerialization.msgPack`                     |  563 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcSerialization.StreamOptions.maxBufferSize` |   77 | `member`           | **optional**    |

## Recommended

### `effect/unstable/rpc/RpcSerialization.layerJson`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:577`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** RPC serialization layer that uses JSON for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.layerJson`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RpcSerialization.layerJson`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.layerNdjson`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:591`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** RPC serialization layer that uses NDJSON for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.layerNdjson`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RpcSerialization.layerNdjson`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.layerNdjsonWith`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:599`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** RPC serialization layer that uses NDJSON with custom streaming options.
- **Signature hint:** `declare function layerNdjsonWith(options?: StreamOptions): Layer.Layer<RpcSerialization>`
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.layerNdjsonWith`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RpcSerialization.layerNdjsonWith`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.layerJsonRpc`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:608`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** RPC serialization layer that uses JSON-RPC for serialization.
- **Signature hint:** `declare function layerJsonRpc(options?: { readonly contentType?: string | undefined; }): Layer.Layer<RpcSerialization>`
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.layerJsonRpc`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RpcSerialization.layerJsonRpc`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.layerNdJsonRpc`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:619`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** RPC serialization layer that uses newline-delimited JSON-RPC for serialization.
- **Signature hint:** `declare function layerNdJsonRpc(options?: { readonly contentType?: string | undefined; readonly maxBufferSize?: number | 'unbounded' | undefined; }): Layer.Layer<RpcSerialization>`
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.layerNdJsonRpc`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RpcSerialization.layerNdJsonRpc`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.layerMsgPack`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:635`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** RPC serialization layer that uses MessagePack for serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.layerMsgPack`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RpcSerialization.layerMsgPack`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.layerMsgPackWith`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:643`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** RPC serialization layer that uses MessagePack with custom options.
- **Signature hint:** `declare function layerMsgPackWith(options?: (Msgpackr.Options & StreamOptions) | undefined): Layer.Layer<RpcSerialization>`
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.layerMsgPackWith`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RpcSerialization.layerMsgPackWith`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.RpcSerialization`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:33`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Service that describes how RPC protocol messages are encoded and decoded, including the content type and whether the serialization format provides message framing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.RpcSerialization`.
- **Suggested snippet:** Consume `RpcSerialization.RpcSerialization` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.MaxBufferSizeExceeded`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:58`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when a streaming parser retains more data than its configured buffer limit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.MaxBufferSizeExceeded`.
- **Suggested snippet:** Create or capture `RpcSerialization.MaxBufferSizeExceeded` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.makeNdjson`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:117`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Serializes RPC protocol messages as newline-delimited JSON, framing each message with a trailing newline.
- **Signature hint:** `declare function makeNdjson(options?: StreamOptions): RpcSerialization['Service']`
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.makeNdjson`.
- **Suggested snippet:** Construct one representative value with `RpcSerialization.makeNdjson`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.jsonRpc`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:181`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Creates a JSON-RPC 2.0 serialization for RPC protocol messages without additional message framing.
- **Signature hint:** `declare function jsonRpc(options?: { readonly contentType?: string | undefined; }): RpcSerialization['Service']`
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.jsonRpc`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a JSON-RPC 2.0 serialization for RPC protocol messages without additional message framing. Call `RpcSerialization.jsonRpc` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.ndJsonRpc`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:215`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Creates a newline-delimited JSON-RPC 2.0 serialization for RPC protocol messages.
- **Signature hint:** `declare function ndJsonRpc(options?: { readonly contentType?: string | undefined; readonly maxBufferSize?: number | 'unbounded' | undefined; }): RpcSerialization['Service']`
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.ndJsonRpc`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a newline-delimited JSON-RPC 2.0 serialization for RPC protocol messages. Call `RpcSerialization.ndJsonRpc` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcSerialization.makeMsgPack`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:506`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **recommended**
- **Current description:** Create a MessagePack serialization with custom msgpackr options.
- **Signature hint:** `declare function makeMsgPack(options?: (Msgpackr.Options & StreamOptions) | undefined): RpcSerialization['Service']`
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.makeMsgPack`.
- **Suggested snippet:** Construct one representative value with `RpcSerialization.makeMsgPack`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/rpc/RpcSerialization.Parser`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:46`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **optional**
- **Current description:** A stateful parser for an RPC serialization format, able to decode input chunks into protocol messages and encode messages for transport.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcSerialization.Parser`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcSerialization.StreamOptions`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:72`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **optional**
- **Current description:** Options shared by streaming RPC serialization formats.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcSerialization.StreamOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcSerialization.json`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:95`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **optional**
- **Current description:** JSON RPC serialization for whole message payloads. It does not include message framing, so it is intended for transports that frame responses themselves.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.json`.
- **Suggested snippet:** Use `RpcSerialization.json` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcSerialization.ndjson`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:172`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **optional**
- **Current description:** Default newline-delimited JSON RPC serialization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.ndjson`.
- **Suggested snippet:** Use `RpcSerialization.ndjson` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcSerialization.msgPack`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:563`
- **Kind / category:** `root-declaration` / `serialization`
- **Priority:** **optional**
- **Current description:** Default MessagePack RPC serialization using record support and built-in message framing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcSerialization } from "effect/unstable/rpc"` and use `RpcSerialization.msgPack`.
- **Suggested snippet:** Use `RpcSerialization.msgPack` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcSerialization.StreamOptions.maxBufferSize`

- **Source:** `packages/effect/src/unstable/rpc/RpcSerialization.ts:77`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Maximum number of bytes or string code units retained for an incomplete frame. The default is 16 MiB. Use `"unbounded"` to disable the limit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcSerialization.StreamOptions.maxBufferSize` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

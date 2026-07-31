# Example Suggestions: `effect/unstable/rpc/RpcMessage`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts`
- **Uncovered API records:** 33
- **Priorities:** 0 required, 3 recommended, 28 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind               | Priority        |
| -------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/rpc/RpcMessage.ResponseExitDieEncoded`        |  336 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcMessage.ResponseDefectEncoded (value)` |  358 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcMessage.isTerminalResponse`            |  410 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcMessage.RequestId (type)`              |   43 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ExitEncoded`                   |  257 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ResponseChunkEncoded`          |  230 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ResponseChunk`                 |  243 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ResponseExitEncoded`           |  283 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ClientProtocolError`           |  296 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ResponseExit`                  |  308 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.Interrupt`                     |  108 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.InterruptEncoded`              |  131 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.FromClient`                    |   26 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.FromClientEncoded`             |   34 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.RequestId (value)`             |   51 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.RequestEncoded`                |   60 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.Request`                       |   79 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.Ack`                           |   96 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.AckEncoded`                    |  120 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.Eof`                           |  143 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.Ping`                          |  154 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.constEof`                      |  164 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.constPing`                     |  172 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.FromServer`                    |  180 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.FromServerEncoded`             |  192 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ResponseId`                    |  221 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ResponseDefectEncoded (type)`  |  322 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ResponseDefect`                |  369 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ClientEnd`                     |  381 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.Pong`                          |  392 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.constPong`                     |  402 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcMessage.ResponseIdTypeId (value)`      |  205 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcMessage.ResponseIdTypeId (type)`       |  213 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/rpc/RpcMessage.ResponseExitDieEncoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:336`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **recommended**
- **Current description:** Creates an encoded terminal response for a request whose exit is a defect encoded with `Schema.Defect()`.
- **Signature hint:** `declare function ResponseExitDieEncoded(options: { readonly requestId: RequestId; readonly defect: unknown; }): ResponseExitEncoded`
- **Import guidance:** Start from `import { RpcMessage } from "effect/unstable/rpc"` and use `RpcMessage.ResponseExitDieEncoded`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an encoded terminal response for a request whose exit is a defect encoded with `Schema.Defect()`. Call `RpcMessage.ResponseExitDieEncoded` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcMessage.ResponseDefectEncoded (value)`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:358`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **recommended**
- **Current description:** Creates a transport-encoded defect response by encoding the input with `Schema.Defect()`.
- **Signature hint:** `declare function ResponseDefectEncoded(input: unknown): ResponseDefectEncoded`
- **Import guidance:** Start from `import { RpcMessage } from "effect/unstable/rpc"` and use `RpcMessage.ResponseDefectEncoded`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a transport-encoded defect response by encoding the input with `Schema.Defect()`. Call `RpcMessage.ResponseDefectEncoded` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcMessage.isTerminalResponse`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:410`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks if the response type is terminal.
- **Signature hint:** `declare function isTerminalResponse(response: FromServerEncoded): boolean`
- **Import guidance:** Start from `import { RpcMessage } from "effect/unstable/rpc"` and use `RpcMessage.isTerminalResponse`.
- **Suggested snippet:** Create two values within the accepted input domain, one satisfying the documented condition and one not, call `RpcMessage.isTerminalResponse`, and assert `true` and `false`. Do not claim TypeScript narrowing because the signature returns only `boolean`.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/rpc/RpcMessage.RequestId (type)`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:43`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** A branded request identifier used to correlate RPC requests, responses, chunks, acknowledgements, and interrupts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.RequestId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ExitEncoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:257`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** The transport representation of an RPC `Exit`, encoding success values or a failure cause made of failures, defects, and interrupts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ExitEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ResponseChunkEncoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:230`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** The transport-encoded response message containing a non-empty batch of stream chunk values for a request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ResponseChunkEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ResponseChunk`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:243`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** The decoded response message containing a non-empty batch of stream chunk values for a specific client and request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ResponseChunk`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ResponseExitEncoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:283`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** The transport-encoded terminal response for a request, carrying the encoded `Exit`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ResponseExitEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ClientProtocolError`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:296`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** A server-to-client protocol message reporting a client protocol error to all affected in-flight requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ClientProtocolError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ResponseExit`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:308`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** The decoded terminal response for a request, carrying the typed `Rpc.Exit` for the RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ResponseExit`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.Interrupt`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:108`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** A decoded request to interrupt an in-flight RPC, carrying the request id and interrupting fiber ids.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.Interrupt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.InterruptEncoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:131`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** The transport-encoded request to interrupt an in-flight RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.InterruptEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.FromClient`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:26`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Decoded messages that can be sent from an RPC client to a server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.FromClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.FromClientEncoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:34`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Transport-encoded messages that can be sent from an RPC client to a server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.FromClientEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.RequestId (value)`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:51`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Converts a bigint or string request id into the branded `RequestId` type.
- **Signature hint:** `declare function RequestId(id: string | number): RequestId`
- **Import guidance:** Start from `import { RpcMessage } from "effect/unstable/rpc"` and use `RpcMessage.RequestId`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Converts a bigint or string request id into the branded `RequestId` type. Call `RpcMessage.RequestId` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.RequestEncoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:60`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** The transport-encoded RPC request envelope, including the string request id, RPC tag, encoded payload, headers, and optional trace context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.RequestEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.Request`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:79`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** The decoded RPC request envelope for an RPC union, carrying a branded request id, typed RPC tag, decoded payload, headers, and optional trace context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.Request`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.Ack`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:96`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** A decoded acknowledgement for a streamed RPC response chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.Ack`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.AckEncoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:120`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** The transport-encoded acknowledgement for a streamed RPC response chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.AckEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.Eof`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:143`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** A client-to-server message indicating that the client has finished sending input for the current connection or request batch.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.Eof`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.Ping`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:154`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** A client-to-server keepalive message used by protocols that monitor connection liveness.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.Ping`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.constEof`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:164`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Represents the reusable `Eof` message value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcMessage } from "effect/unstable/rpc"` and use `RpcMessage.constEof`.
- **Suggested snippet:** Use `RpcMessage.constEof` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.constPing`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:172`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Represents the reusable `Ping` message value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcMessage } from "effect/unstable/rpc"` and use `RpcMessage.constPing`.
- **Suggested snippet:** Use `RpcMessage.constPing` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.FromServer`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:180`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Decoded messages that can be sent from an RPC server to a client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.FromServer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.FromServerEncoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:192`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Transport-encoded messages that can be sent from an RPC server to a client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.FromServerEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ResponseId`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:221`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** A branded numeric identifier for server responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ResponseId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ResponseDefectEncoded (type)`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:322`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** The transport-encoded server defect message used for protocol-level defects that affect the client connection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ResponseDefectEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ResponseDefect`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:369`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** The decoded server defect message for a client connection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ResponseDefect`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.ClientEnd`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:381`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** A server message indicating that the client connection has ended.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.ClientEnd`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.Pong`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:392`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** A server-to-client keepalive response to a `Ping` message.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcMessage.Pong`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcMessage.constPong`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:402`
- **Kind / category:** `root-declaration` / `response`
- **Priority:** **optional**
- **Current description:** Represents the reusable `Pong` message value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcMessage } from "effect/unstable/rpc"` and use `RpcMessage.constPong`.
- **Suggested snippet:** Use `RpcMessage.constPong` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/rpc/RpcMessage.ResponseIdTypeId (value)`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:205`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The brand identifier used by the `ResponseId` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcMessage } from "effect/unstable/rpc"` and use `RpcMessage.ResponseIdTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcMessage.ResponseIdTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcMessage.ResponseIdTypeId (type)`

- **Source:** `packages/effect/src/unstable/rpc/RpcMessage.ts:213`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** The literal type of the `ResponseId` brand identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/rpc/RpcMessage.ResponseIdTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

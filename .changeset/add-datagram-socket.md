---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
---

Add `DatagramSocket` in `effect/unstable/socket` with `NodeDatagramSocket`,
`BunDatagramSocket`, and `DenoDatagramSocket` platform adapters for scoped UDP
sockets. Includes `bind`, `connect`, and factory `layer` APIs, connected peers,
packet readers and writers, bounded receive buffering, and stream and channel
adapters.

Bun uses native UDP sockets with interruptible backpressure handling. Node and
Deno share the Node-compatible adapter, which explicitly filters connected
sockets to their configured peer. The shared adapter is also exported from
`@effect/platform-node-shared/NodeDatagramSocket`.

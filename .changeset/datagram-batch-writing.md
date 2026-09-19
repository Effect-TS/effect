---
"effect": patch
"@effect/platform-bun": patch
"@effect/platform-node-shared": patch
---

Add `writeMany` for groups of separate datagrams. Batch capability and sequential fallback are resolved during socket construction. Channels await each group before requesting more input. `Binding.sendMany` is optional and completes after local acceptance of every supplied packet, including any native backpressure waits. Successful writes do not confirm remote delivery; application queue and retry policies remain caller-controlled.

### Breaking changes

`DatagramSocket` is now the tagged union of `UnconnectedSocket` and `ConnectedSocket`. Use `DatagramSocket.UnconnectedSocket` for the result of `bind`, `fromTransport`, or `makeUnconnected`, and `DatagramSocket.ConnectedSocket` for the result of `connect`, `fromConnectedTransport`, or `makeConnected`. Narrow `_tag` (`"UnconnectedSocket"` or `"ConnectedSocket"`) before writing to a union. The `DatagramSocket` service now accepts either variant. Socket tags and brands are inherited from variant prototypes; use the constructors when rebuilding sockets to preserve their identity. Channel adapters use concrete overloads for the two socket variants; their outgoing element type is no longer a generic parameter. Use `toChannelWith<E>()` to specify the upstream error type.

Replace `IncomingPacket` and `OutgoingPacket` with `Packet`, containing `data: Uint8Array` and `peer: InetAddress`. Read the sender from `packet.peer` instead of `packet.source`, and supply a batch destination as `peer` instead of `destination`. Packet and socket interfaces no longer take payload type parameters; encode and decode application values in higher-level stream or channel adapters.

Read and write operations are exposed directly, without `Reader` or `Writer` objects. Replace `socket.reader.pull` with `socket.pull`. For unconnected sockets, replace `socket.writer.write({ data, destination })` with `socket.write({ data, peer: destination })`; `writeMany` accepts an array of `Packet`. Connected sockets expose `write(data)` and `writeMany(payloads)` for byte payloads.

Replace `make` with `makeUnconnected`, which accepts flat `MakeUnconnectedOptions` containing `address`, `pull`, `write(packet)`, and optional `writeMany`. Use `makeConnected` with `MakeConnectedOptions` to supply an additional `remote` address and payload-only write operations. Both constructors preserve a supplied `writeMany` directly, including calls with empty batches, and select a sequential implementation when it is omitted; custom sockets constructed without them must provide `writeMany`. Transport bindings receive the new `Packet` shape for both `send` and `sendMany`.

The error reason union now includes `DatagramSocketBatchWriteError`; update exhaustive error handling to cover it. Native batch failures may follow unknown partial transmission and do not identify a safe retry offset or failed destination. Native validation may reject a whole batch window before submission; configured payload-size errors submit the preceding valid prefix first. The single-write error's `destination` field is unchanged.

Remove `@effect/platform-bun/BunDatagramSocket` and its root export. The built-in Bun datagram adapter is no longer available; consumers must supply a transport through `DatagramSocket.fromTransport` or `fromConnectedTransport`.

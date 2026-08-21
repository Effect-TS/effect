---
"effect": minor
---

Make RPC serialization schema-aware.

`RpcSerialization` now carries a `codecFor` hook that builds the codec filling the
`unknown` holes of the protocol messages (request payloads, stream chunks, exits,
and defects). Framing is unchanged: `Parser` still sees only already-encoded
envelopes.

```ts
export type HoleCodecFor = <S extends Schema.Top>(
  schema: S
) => Schema.Codec<S["Type"], unknown, S["DecodingServices"], S["EncodingServices"]>
```

`RpcClient.Protocol` and `RpcServer.Protocol` re-pass `codecFor`, so `RpcClient.make`
and `RpcServer` read it off the protocol instead of hardcoding `Schema.toCodecJson`.
Custom `Protocol` implementations must now supply `codecFor`. HTTP and socket
protocols forward `serialization.codecFor`; worker protocols use
`Schema.toCodecJson`, because structured clone does not go through
`RpcSerialization`. Worker initial messages keep `Schema.toCodecJson`.

`RpcMessage.ResponseDefectEncoded` and `RpcMessage.ResponseExitDieEncoded` now wrap
an already-encoded defect instead of encoding it with `Schema.Defect()`.
`ResponseExitDieEncoded` takes `encodedDefect` in place of `defect`.

On the cluster side, the entity payload and the replies on the runner network path
use the transport's `codecFor`, and `Envelope.PartialRequest.payload` and
`Reply.Encoded` are now the named `Envelope.OpaqueHole` schema so the outer runner
encode leaves the already-encoded hole alone. `RunnerServer.layerHandlers` therefore
requires `RpcSerialization`. Cluster storage is unchanged and stays JSON.

The built-in JSON, NDJSON, JSON-RPC, and MessagePack serializations all return
`Schema.toCodecJson`, so every wire format is unchanged.

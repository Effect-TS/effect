---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
---

Make the `Socket.WebSocketConstructor` service effectful: the constructor now
returns `Effect<WebSocketLike, SocketError>` and is invoked afresh on every
connection attempt (each reader acquisition, including reconnects). This
enables per-connection effectful setup — such as reading a signing key and
computing a fresh protocol token on each (re)connect — and middleware layers
that wrap a base constructor. Failures surface as a `SocketError` at reader
acquisition, exactly like a failed dial or open timeout, so existing retry
policies treat them as failed connection attempts.

```ts
import { Effect, Layer } from "effect"
import { Socket } from "effect/unstable/socket"

declare const freshSignedToken: Effect.Effect<string, Socket.SocketError>

const layerSignedProtocols = Layer.effect(Socket.WebSocketConstructor)(
  Effect.gen(function*() {
    const base = yield* Socket.WebSocketConstructor
    const withToken: Socket.WebSocketConstructor["Service"] = (url) =>
      Effect.flatMap(freshSignedToken, (token) => base(url, token))
    return withToken
  })
).pipe(Layer.provide(Socket.layerWebSocketConstructorGlobal))
```

Existing constructor implementations can wrap their body in `Effect.sync`.

---
"@effect/platform-node": minor
"@effect/experimental": minor
"@effect/platform": minor
---

replace isows with WebSocketConstructor service in @effect/platform/Socket

You now have to provide a WebSocketConstructor implementation to the `Socket.makeWebSocket` api.

```ts
import * as Socket from "@effect/platform/Socket"
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import { Effect } from "effect"

Socket.makeWebSocket("ws://localhost:8080").pipe(
  Effect.provide(NodeSocket.layerWebSocketConstructor) // use "ws" npm package
)
```

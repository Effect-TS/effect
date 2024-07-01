import * as DevTools from "@effect/experimental/DevTools"
import { NodeRuntime, NodeSocket } from "@effect/platform-node"
import { Effect, Layer } from "effect"

const program = Effect.log("Hello!").pipe(
  Effect.delay(2000),
  Effect.withSpan("Hi", { attributes: { foo: "bar" } }),
  Effect.forever
)

program.pipe(
  Effect.provide(
    DevTools.layerWebSocket().pipe(
      Layer.provide(NodeSocket.layerWebSocketConstructor)
    )
  ),
  NodeRuntime.runMain
)

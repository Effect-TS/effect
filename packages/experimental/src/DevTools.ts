/**
 * @since 1.0.0
 */
import * as NodeSocket from "@effect/platform-node/NodeSocket"
import * as Layer from "effect/Layer"
import * as Client from "./DevTools/Client.js"

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (url = "ws://localhost:34437"): Layer.Layer<never> =>
  Client.layerTracer(url).pipe(
    Layer.provide(NodeSocket.layerWebSocketConstructor)
  )

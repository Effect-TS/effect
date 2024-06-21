/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Layer from "effect/Layer"
import * as Client from "./DevTools/Client.js"

/**
 * @since 1.0.0
 * @category layers
 */
export const layerSocket: Layer.Layer<never, never, Socket.Socket> = Client.layerTracer

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (url = "ws://localhost:34437"): Layer.Layer<never, never, Socket.WebSocketConstructor> =>
  Client.layerTracer.pipe(
    Layer.provide(Socket.layerWebSocket(url))
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (url = "ws://localhost:34437"): Layer.Layer<never> =>
  layerWebSocket(url).pipe(
    Layer.provide(Socket.layerWebSocketConstructorGlobal)
  )

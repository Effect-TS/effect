/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Layer from "effect/Layer"
import * as Client from "./Client.js"

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (url?: string): Layer.Layer<never> =>
  Client.layerTracer(url).pipe(
    Layer.provide(Layer.succeed(Socket.WebSocketConstructor, (url) => new globalThis.WebSocket(url)))
  )

/**
 * @since 1.0.0
 */
import * as Socket from "@effect/platform/Socket"
import * as Layer from "effect/Layer"

/**
 * @since 1.0.0
 */
export * from "@effect/platform-node-shared/NodeSocket"

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocket = (url: string, options?: {
  readonly closeCodeIsError?: (code: number) => boolean
}): Layer.Layer<Socket.Socket> =>
  Layer.scoped(Socket.Socket, Socket.makeWebSocket(url, options)).pipe(
    Layer.provide(layerWebSocketConstructor)
  )

/**
 * @since 1.0.0
 * @category layers
 */
export const layerWebSocketConstructor: Layer.Layer<Socket.WebSocketConstructor> = Layer.succeed(
  Socket.WebSocketConstructor,
  (url, protocols) => new globalThis.WebSocket(url, protocols)
)

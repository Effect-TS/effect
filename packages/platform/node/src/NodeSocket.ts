/**
 * Node.js socket constructors and layers for Effect sockets.
 *
 * This module re-exports the shared Node socket support for TCP connections,
 * Unix domain socket connections, and Node `Duplex` streams. It also provides
 * WebSocket constructor layers: one that uses `globalThis.WebSocket` when
 * present and falls back to `ws`, one that always uses `ws`, and one that
 * creates a `Socket.Socket` layer for a WebSocket URL.
 *
 * @stability unstable
 * @since 4.0.0
 */
import { NodeWS as WS } from "@effect/platform-node-shared/NodeSocket"
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import { flow } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Socket from "effect/socket/Socket"

/**
 * @since 4.0.0
 */
export * from "@effect/platform-node-shared/NodeSocket"

const makeWebSocketWS: Socket.WebSocketConstructor["Service"] = (url, options) => {
  if (options === undefined || typeof options === "string" || Array.isArray(options)) {
    return new WS.WebSocket(url, options)
  }
  return new WS.WebSocket(url, options.protocols, { headers: options.headers })
}

/**
 * Provides a `Socket.WebSocketConstructor`, using `globalThis.WebSocket` when
 * available and falling back to the `ws` package otherwise.
 * Client options objects use `ws` so handshake headers and subprotocols can
 * be supplied together.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerWebSocketConstructor: Layer.Layer<
  Socket.WebSocketConstructor
> = Layer.sync(Socket.WebSocketConstructor)(() => {
  if ("WebSocket" in globalThis) {
    return (url, options) => {
      if (options === undefined || typeof options === "string" || Array.isArray(options)) {
        return new globalThis.WebSocket(url, options)
      }
      return makeWebSocketWS(url, options)
    }
  }
  return makeWebSocketWS
})

/**
 * Provides a `Socket.WebSocketConstructor` backed explicitly by the `ws`
 * package.
 * Supports handshake headers alongside subprotocols in client options objects.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerWebSocketConstructorWS: Layer.Layer<
  Socket.WebSocketConstructor
> = Layer.succeed(Socket.WebSocketConstructor)(makeWebSocketWS)

/**
 * Creates a `Socket.Socket` layer for a WebSocket URL using the Node WebSocket
 * constructor layer, honoring protocol, handshake-header, open-timeout, and
 * high-water-mark options.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerWebSocket: (
  url: string | Effect.Effect<string>,
  options?: {
    readonly openTimeout?: Duration.Input | undefined
    readonly protocols?: string | Array<string> | undefined
    readonly headers?: Readonly<Record<string, string>> | undefined
    readonly highWaterMark?: number | undefined
  } | undefined
) => Layer.Layer<Socket.Socket, never, never> = flow(
  Socket.makeWebSocket,
  Layer.effect(Socket.Socket),
  Layer.provide(layerWebSocketConstructor)
)

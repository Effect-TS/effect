/**
 * The `ws` package and a WebSocket client layer backed by it.
 *
 * This module re-exports `ws` for WebSocket servers and HTTP upgrades. Client
 * sockets from `NodeSocket` use Node's global `WebSocket` and do not load
 * `ws`; import this module only when `ws` is needed.
 *
 * @stability unstable
 * @since 4.1.0
 */
import { WebSocket } from "@effect/platform-node-shared/NodeWS"
import * as Layer from "effect/Layer"
import * as Socket from "effect/socket/Socket"

/**
 * @since 4.1.0
 */
export * from "@effect/platform-node-shared/NodeWS"

/**
 * Provides a `Socket.WebSocketConstructor` backed by the `ws` package.
 *
 * **Details**
 *
 * Supports handshake headers alongside subprotocols in client options objects.
 * `ws` sockets can pause reads, so `Socket.fromWebSocket` stops reading once
 * buffered frames reach its `highWaterMark` (64 KiB by default).
 *
 * @stability unstable
 * @category layers
 * @since 4.1.0
 */
export const layerWebSocketConstructor: Layer.Layer<
  Socket.WebSocketConstructor
> = Layer.succeed(Socket.WebSocketConstructor)((url, options) => {
  if (options === undefined || typeof options === "string" || Array.isArray(options)) {
    return new WebSocket(url, options)
  }
  return new WebSocket(url, options.protocols, { headers: options.headers })
})

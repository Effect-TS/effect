/**
 * Node.js socket constructors and layers for Effect sockets.
 *
 * This module re-exports the shared Node socket support for TCP connections,
 * Unix domain socket connections, and Node `Duplex` streams. It also provides
 * WebSocket client layers backed by Node's global `WebSocket`. A client backed
 * by the `ws` package is available from `NodeWS`.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Duration from "effect/Duration"
import type * as Effect from "effect/Effect"
import { flow } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Socket from "effect/socket/Socket"

/**
 * @since 4.0.0
 */
export * from "@effect/platform-node-shared/NodeSocket"

/**
 * Provides a `Socket.WebSocketConstructor` backed by Node's global
 * `WebSocket`.
 *
 * **Details**
 *
 * Client options objects are passed to the constructor as Node's
 * `WebSocketInit`, so handshake headers and subprotocols can be supplied
 * together.
 *
 * Node's `WebSocket` cannot pause reads. `Socket.fromWebSocket` buffers
 * incoming frames without limit, or fails with a `SocketReadError` once a
 * configured `highWaterMark` is exceeded. Use `NodeWS.layerWebSocketConstructor`
 * when the transport should pause instead.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerWebSocketConstructor: Layer.Layer<
  Socket.WebSocketConstructor
> = Layer.succeed(Socket.WebSocketConstructor)((url, options) => {
  if (options === undefined || typeof options === "string" || Array.isArray(options)) {
    return new globalThis.WebSocket(url, options)
  }
  const init: WebSocketInit = {}
  if (options.protocols !== undefined) init.protocols = options.protocols
  if (options.headers !== undefined) init.headers = options.headers
  return new (globalThis.WebSocket as unknown as NodeWebSocketConstructor)(url, init)
})

// Node's `WebSocketInit`, which the DOM `WebSocket` constructor type omits.
interface WebSocketInit {
  protocols?: string | Array<string>
  headers?: Readonly<Record<string, string>>
}

type NodeWebSocketConstructor = new(url: string, init: WebSocketInit) => globalThis.WebSocket

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

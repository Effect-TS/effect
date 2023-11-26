/**
 * @since 1.0.0
 */
import * as Stream from "@effect/platform-node/Stream"
import * as Layer from "effect/Layer"
import * as Net from "node:net"
import * as Socket from "../Socket.js"

/**
 * @since 1.0.0
 */
export * from "../Socket.js"

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = Layer.succeed(
  Socket.SocketPlatform,
  Socket.SocketPlatform.of({
    [Socket.SocketPlatformTypeId]: Socket.SocketPlatformTypeId,
    open: (options) =>
      Stream.fromDuplex(
        () => Net.createConnection({ ...options }),
        (error) => new Socket.SocketError({ reason: "Read", error })
      )
  })
)

import * as Effect from "effect/Effect"
import * as Socket from "effect/socket/Socket"
import type * as Net from "node:net"
import type { Duplex } from "node:stream"
import * as NodeSocket from "../NodeSocket.ts"

/**
 * Wraps an upgraded connection. Acquiring the reader calls `onOpen`; releasing
 * its scope closes the connection.
 *
 * No `data` listener is attached before acquisition, so early bytes stay buffered.
 *
 * @internal
 */
export const toSocket = (conn: Duplex, onOpen?: () => void): Effect.Effect<Socket.Socket> =>
  NodeSocket.fromDuplex(
    Effect.acquireRelease(
      Effect.suspend(() => {
        if (conn.destroyed) {
          return Effect.fail(
            new Socket.SocketError({
              reason: new Socket.SocketOpenError({
                kind: "Unknown",
                cause: new Error("The upgraded connection closed before it was read")
              })
            })
          )
        }
        onOpen?.()
        return Effect.succeed(conn)
      }),
      (conn) =>
        Effect.sync(() => {
          if (conn.destroyed) return
          if ("destroySoon" in conn) {
            ;(conn as Net.Socket).destroySoon()
          } else {
            conn.destroy()
          }
        })
    )
  )

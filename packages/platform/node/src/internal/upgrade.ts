import * as Effect from "effect/Effect"
import { constVoid } from "effect/Function"
import * as Socket from "effect/socket/Socket"
import type * as Net from "node:net"
import type { Duplex } from "node:stream"
import * as NodeSocket from "../NodeSocket.ts"

/**
 * Takes over the connection of an HTTP upgrade. Bytes received past the HTTP
 * head are pushed back so the socket reader sees them first, and the
 * connection is paused until the reader is acquired. The reader reports
 * connection errors, so they are ignored until then.
 *
 * @internal
 */
export const takeOver = (conn: Duplex, head: Uint8Array | undefined): void => {
  if (head !== undefined && head.length > 0) conn.unshift(head)
  conn.pause()
  conn.on("error", constVoid)
}

/**
 * Destroys the connection when the request is aborted.
 *
 * @internal
 */
export const destroyOnAbort = (conn: Duplex, signal: AbortSignal): void => {
  if (signal.aborted) {
    conn.destroy()
    return
  }
  const onAbort = () => conn.destroy()
  signal.addEventListener("abort", onAbort, { once: true })
  conn.once("close", () => signal.removeEventListener("abort", onAbort))
}

/**
 * Wraps an upgraded connection as a `Socket`. `onOpen` runs when the reader
 * is acquired, and releasing the reader's scope closes the connection.
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

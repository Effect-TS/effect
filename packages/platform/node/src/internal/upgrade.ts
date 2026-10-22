import * as Effect from "effect/Effect"
import * as Socket from "effect/socket/Socket"
import type * as Net from "node:net"
import { type Duplex, Readable } from "node:stream"
import * as NodeSocket from "../NodeSocket.ts"

/**
 * Wraps an upgraded connection. Acquiring the reader runs `open`; releasing
 * its scope closes the connection.
 *
 * No `data` listener is attached before acquisition, so early bytes stay buffered.
 *
 * @internal
 */
export const toSocket = (
  conn: Duplex,
  open: Effect.Effect<void, Socket.SocketError> = Effect.void
): Effect.Effect<Socket.Socket> =>
  NodeSocket.fromDuplex(
    Effect.acquireRelease(
      Effect.suspend(() =>
        conn.destroyed
          ? Effect.fail(openError("The upgraded connection closed before it was read"))
          : Effect.as(open, conn)
      ),
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

const openError = (cause: unknown) =>
  new Socket.SocketError({
    reason: new Socket.SocketOpenError({
      kind: "Unknown",
      cause: typeof cause === "string" ? new Error(cause) : cause
    })
  })

/**
 * Node 25 and older stop parsing at the head of an upgrade request, leaving
 * the body in `head` and on the connection. Reads a `Content-Length` body
 * from them on demand and returns the bytes after it.
 *
 * @internal
 */
export const frameBody = (conn: Duplex, head: Buffer, length: number): {
  readonly body: Readable
  readonly rest: Buffer
} => {
  if (head.length >= length) {
    return {
      body: Readable.from(length === 0 ? [] : [head.subarray(0, length)], { objectMode: false }),
      rest: head.subarray(length)
    }
  }
  let remaining = length - head.length
  let reading = false
  const stop = () => {
    conn.off("readable", onReadable)
    conn.off("end", onEnd)
  }
  const onReadable = () => {
    while (remaining > 0) {
      let chunk = conn.read() as Buffer | null
      if (chunk === null) return
      if (chunk.length > remaining) {
        conn.unshift(chunk.subarray(remaining))
        chunk = chunk.subarray(0, remaining)
      }
      remaining -= chunk.length
      if (!body.push(chunk) && remaining > 0) return
    }
    stop()
    body.push(null)
  }
  const onEnd = () => {
    stop()
    body.destroy(new Error("The connection closed before the request body ended"))
  }
  const body = new Readable({
    read() {
      if (reading) return onReadable()
      reading = true
      conn.on("readable", onReadable)
      conn.on("end", onEnd)
    }
  })
  if (head.length > 0) body.push(head)
  return { body, rest: Buffer.alloc(0) }
}

/**
 * Waits for the request body to end before the `101` is written, discarding
 * any of it the handler did not read, up to `maxBytes`.
 *
 * @internal
 */
export const drainBody = (body: Readable, maxBytes: number | undefined): Effect.Effect<void, Socket.SocketError> =>
  Effect.callback((resume) => {
    if (body.readableEnded) return resume(Effect.void)
    if (body.destroyed) return resume(Effect.fail(openError("The request closed before its body ended")))
    let bytes = 0
    const done = (effect: Effect.Effect<void, Socket.SocketError>) => {
      cleanup()
      resume(effect)
    }
    const onData = (chunk: Uint8Array) => {
      bytes += chunk.length
      if (maxBytes !== undefined && bytes > maxBytes) {
        done(Effect.fail(openError("The request body exceeds the maximum body size")))
      }
    }
    const onEnd = () => done(Effect.void)
    const onError = (cause: Error) => done(Effect.fail(openError(cause)))
    const onClose = () => done(Effect.fail(openError("The request closed before its body ended")))
    const cleanup = () => {
      body.off("data", onData)
      body.off("end", onEnd)
      body.off("error", onError)
      body.off("close", onClose)
    }
    body.on("data", onData)
    body.on("end", onEnd)
    body.on("error", onError)
    body.on("close", onClose)
    body.resume()
    return Effect.sync(cleanup)
  })

// Internal implementation.
import type { Connector, Endpoint, Transport } from "@effect/redis/RedisConnection"
import { RedisError } from "@effect/redis/RedisError"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Semaphore from "effect/Semaphore"
import { Buffer } from "node:buffer"
import * as Net from "node:net"
import type { Duplex } from "node:stream"
import * as Tls from "node:tls"

export interface Options {
  readonly connectTimeout?: Duration.Input | undefined
  /** Supplies an already connected, binary Duplex for testing or custom transports. */
  readonly stream?: ((endpoint: Endpoint) => Duplex) | undefined
}

export const makeConnector = (options: Options = {}): Connector =>
  Effect.fnUntraced(function*(endpoint: Endpoint) {
    const connectTimeout = yield* Effect.try({
      try: () => Duration.toMillis(options.connectTimeout ?? "10 seconds"),
      catch: () =>
        new RedisError({ reason: "Timeout", message: "Invalid Redis connection timeout", outcome: "NotSent" })
    })
    const invalidTimeoutInput = Number.isNaN(options.connectTimeout) ||
      (typeof options.connectTimeout === "object" && !Duration.isDuration(options.connectTimeout) &&
        Object.values(options.connectTimeout).some(Number.isNaN))
    if (invalidTimeoutInput || Number.isNaN(connectTimeout) || connectTimeout < 0) {
      return yield* Effect.fail(
        new RedisError({ reason: "Timeout", message: "Invalid Redis connection timeout", outcome: "NotSent" })
      )
    }
    const state = yield* Effect.acquireRelease(
      Effect.try({
        try: () => makeState(endpoint, options.stream),
        catch: (cause) =>
          new RedisError({ reason: "Connection", message: "Redis socket creation failed", cause, outcome: "NotSent" })
      }),
      (state) => state.transport.close
    )
    yield* state.open.pipe(
      Effect.timeoutOrElse({
        duration: connectTimeout,
        orElse: () =>
          Effect.fail(new RedisError({ reason: "Timeout", message: "Redis connection timed out", outcome: "NotSent" }))
      }),
      Effect.onError(() => state.transport.close)
    )
    return state.transport
  })

const makeState = (endpoint: Endpoint, supplied?: (endpoint: Endpoint) => Duplex) => {
  const raw = supplied === undefined ? new Net.Socket() : undefined
  const tlsOptions = typeof endpoint.tls === "object" ? endpoint.tls as Tls.ConnectionOptions : {}
  const socket = supplied !== undefined
    ? supplied(endpoint)
    : endpoint.tls
    ? Tls.connect({
      ...tlsOptions,
      host: endpoint.host,
      port: endpoint.port,
      socket: raw!,
      ...(Net.isIP(endpoint.host) === 0 ? { servername: tlsOptions.servername ?? endpoint.host } : {})
    })
    : raw!
  raw?.setNoDelay(true)
  // Leave the readable side paused. Node's highWaterMark bounds buffering and
  // propagates backpressure to TCP without an additional JavaScript queue.
  socket.pause()
  let failure: RedisError | undefined
  let opened = supplied !== undefined
  let closed = socket.closed
  const readers = new Set<(effect: Effect.Effect<Uint8Array, RedisError>) => void>()
  const drains = new Set<(effect: Effect.Effect<void, RedisError>) => void>()
  const openings = new Set<(effect: Effect.Effect<void, RedisError>) => void>()
  const closings = new Set<() => void>()
  const writes = Semaphore.makeUnsafe(1)

  const fail = (error: RedisError) => {
    if (failure !== undefined) return
    failure = error
    for (const resume of readers) resume(Effect.fail(error))
    for (const resume of drains) resume(Effect.fail(error))
    for (const resume of openings) resume(Effect.fail(error))
    readers.clear()
    drains.clear()
    openings.clear()
    socket.destroy()
  }
  const onError = (cause: unknown) =>
    fail(
      new RedisError({
        reason: "Connection",
        message: "Redis socket failed",
        cause,
        outcome: opened ? "Unknown" : "NotSent"
      })
    )
  const onEnd = () => fail(new RedisError({ reason: "Connection", message: "Redis socket ended", outcome: "Unknown" }))
  const onReadable = () => {
    for (const resume of readers) {
      const bytes = socket.read() as Uint8Array | null
      if (bytes === null) break
      readers.delete(resume)
      // Node may reuse external buffers; callers own every returned chunk.
      resume(Effect.succeed(Uint8Array.from(bytes)))
    }
  }
  const onDrain = () => {
    for (const resume of drains) resume(Effect.void)
    drains.clear()
  }
  const onOpen = () => {
    opened = true
    for (const resume of openings) resume(Effect.void)
    openings.clear()
  }
  const readyEvent = endpoint.tls ? "secureConnect" : "connect"
  const onClose = () => {
    fail(
      new RedisError({ reason: "Connection", message: "Redis socket closed", outcome: opened ? "Unknown" : "NotSent" })
    )
    closed = true
    socket.removeListener("error", onError)
    socket.removeListener("end", onEnd)
    socket.removeListener("close", onClose)
    socket.removeListener("readable", onReadable)
    socket.removeListener("drain", onDrain)
    socket.removeListener(readyEvent, onOpen)
    for (const resume of closings) resume()
    closings.clear()
  }
  socket.on("error", onError)
  socket.on("end", onEnd)
  socket.on("close", onClose)
  socket.on("readable", onReadable)
  socket.on("drain", onDrain)
  socket.on(readyEvent, onOpen)

  const drain = Effect.callback<void, RedisError>((resume) => {
    if (failure !== undefined) return resume(Effect.fail(failure))
    if (!socket.writableNeedDrain) return resume(Effect.void)
    drains.add(resume)
    return Effect.sync(() => {
      drains.delete(resume)
    })
  })
  const transport: Transport = {
    read: Effect.callback<Uint8Array, RedisError>((resume) => {
      if (failure !== undefined) return resume(Effect.fail(failure))
      readers.add(resume)
      onReadable()
      return Effect.sync(() => {
        readers.delete(resume)
      })
    }),
    write: (bytes) =>
      writes.withPermit(Effect.gen(function*() {
        // An interrupted writer may leave the stream under backpressure.
        yield* drain
        yield* Effect.try({
          try: () => {
            if (failure !== undefined) throw failure
            // Copy before submission so callers can safely reuse their input.
            socket.write(Buffer.from(bytes))
          },
          catch: (cause) =>
            cause instanceof RedisError
              ? new RedisError({ ...cause, outcome: "NotSent" })
              : new RedisError({ reason: "Connection", message: "Redis write failed", cause, outcome: "Unknown" })
        })
        // A false return accepted the bytes. It must never cause retransmission.
        yield* drain
      })),
    close: Effect.callback<void>((resume) => {
      if (closed) return resume(Effect.void)
      const complete = () => resume(Effect.void)
      closings.add(complete)
      fail(new RedisError({ reason: "Closed", message: "Redis transport closed", outcome: "Unknown" }))
      return Effect.sync(() => {
        closings.delete(complete)
      })
    })
  }
  const open = Effect.callback<void, RedisError>((resume) => {
    if (failure !== undefined) return resume(Effect.fail(failure))
    if (opened) return resume(Effect.void)
    openings.add(resume)
    try {
      if (endpoint.path !== undefined) raw!.connect(endpoint.path)
      else raw!.connect({ ...tlsOptions, host: endpoint.host, port: endpoint.port })
    } catch (cause) {
      onError(cause)
    }
    return Effect.sync(() => {
      openings.delete(resume)
      socket.destroy()
    })
  })
  return { transport, open }
}

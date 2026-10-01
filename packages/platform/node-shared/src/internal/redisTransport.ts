// Internal implementation.
import type { Connector, Endpoint, Transport } from "@effect/redis/RedisConnection"
import { RedisError } from "@effect/redis/RedisError"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
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
  // Deliver incoming data directly to readers. With no reader, retain one
  // owned chunk and pause; Node's highWaterMark bounds the remaining buffering.
  socket.pause()
  let failure: RedisError | undefined
  let opened = supplied !== undefined
  let closed = socket.closed
  let consumer: {
    readonly onBytes: (bytes: Uint8Array) => void
    readonly resume: (effect: Effect.Effect<void, RedisError>) => void
  } | undefined
  interface Writer {
    bytes: string | Buffer | Array<string | Buffer> | undefined
    readonly resume: (effect: Effect.Effect<void, RedisError>) => void
  }
  const writers = new Set<Writer>()
  const openings = new Set<(effect: Effect.Effect<void, RedisError>) => void>()
  const closings = new Set<() => void>()
  let activeWriter: Writer | undefined
  let pumping = false
  let submittingVector = false
  let buffered: Uint8Array | undefined

  const fail = (error: RedisError) => {
    if (failure !== undefined) return
    failure = error
    const reading = consumer
    consumer = undefined
    reading?.resume(Effect.fail(error))
    const active = activeWriter
    activeWriter = undefined
    active?.resume(Effect.fail(new RedisError({ ...error, outcome: "Unknown" })))
    for (const writer of writers) {
      writers.delete(writer)
      writer.bytes = undefined
      writer.resume(Effect.fail(new RedisError({ ...error, outcome: "NotSent" })))
    }
    for (const resume of openings) resume(Effect.fail(error))
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
  const deliver = (bytes: Uint8Array) => {
    const reading = consumer!
    try {
      reading.onBytes(bytes)
    } catch (cause) {
      const error = cause instanceof RedisError
        ? cause
        : new RedisError({ reason: "Connection", message: "Redis byte consumer failed", cause, outcome: "Unknown" })
      if (failure === undefined) fail(error)
      else {
        consumer = undefined
        reading.resume(Effect.fail(error))
      }
    }
  }
  const onData = (bytes: Uint8Array) => {
    if (failure !== undefined) return
    // Native sockets transfer stable Buffer chunks to their data listeners.
    // Custom Duplex producers can reuse their buffers, so snapshot those.
    const owned = supplied === undefined
      ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : Uint8Array.from(bytes)
    if (consumer === undefined) {
      buffered = owned
      socket.pause()
    } else {
      deliver(owned)
    }
  }
  const pump = () => {
    if (pumping) return
    pumping = true
    try {
      while (activeWriter === undefined && !socket.writableNeedDrain && writers.size > 0) {
        if (failure !== undefined) break
        const writer = writers.values().next().value!
        writers.delete(writer)
        activeWriter = writer
        const bytes = writer.bytes!
        writer.bytes = undefined
        try {
          if (Array.isArray(bytes)) {
            submittingVector = true
            try {
              socket.cork()
              try {
                // Every part belongs to one admitted batch. A false write
                // accepts its part; finish the batch before waiting for drain.
                for (const part of bytes) {
                  if (failure !== undefined) break
                  socket.write(part)
                }
              } finally {
                socket.uncork()
              }
            } finally {
              submittingVector = false
            }
          } else socket.write(bytes)
          if (failure !== undefined) break
          // A false result accepted these bytes. Wait for drain without ever
          // writing them again, including after interruption of this caller.
          if (socket.writableNeedDrain) break
          activeWriter = undefined
          writer.resume(Effect.void)
        } catch (cause) {
          fail(new RedisError({ reason: "Connection", message: "Redis write failed", cause, outcome: "Unknown" }))
        }
      }
    } finally {
      pumping = false
    }
  }
  const onDrain = () => {
    if (submittingVector || socket.writableNeedDrain) return
    const writer = activeWriter
    activeWriter = undefined
    writer?.resume(Effect.void)
    pump()
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
    socket.removeListener("data", onData)
    socket.removeListener("drain", onDrain)
    socket.removeListener(readyEvent, onOpen)
    for (const resume of closings) resume()
    closings.clear()
  }
  socket.on("error", onError)
  socket.on("end", onEnd)
  socket.on("close", onClose)
  socket.on("data", onData)
  socket.on("drain", onDrain)
  socket.on(readyEvent, onOpen)

  const snapshotBytes = (bytes: Uint8Array, transfer: boolean): Buffer =>
    transfer ? Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength) : Buffer.from(bytes)

  const queuedWrite: Transport["write"] = (bytes, options) =>
    Effect.callback((resume) => {
      if (failure !== undefined) return resume(Effect.fail(new RedisError({ ...failure, outcome: "NotSent" })))
      // Snapshot ordinary input at admission, including writes waiting behind
      // backpressure. Transferred frames are already private immutable bytes.
      let snapshot: string | Buffer | Array<string | Buffer>
      try {
        const transfer = options?.ownership === "transfer"
        if (typeof bytes === "string") snapshot = bytes
        else if (Array.isArray(bytes)) {
          if (bytes.length === 0) return resume(Effect.void)
          const copied = new Map<Uint8Array, Buffer>()
          snapshot = bytes.map((part: string | Uint8Array) => {
            if (typeof part === "string") return part
            let owned = copied.get(part)
            if (owned === undefined) {
              owned = snapshotBytes(part, transfer)
              copied.set(part, owned)
            }
            return owned
          })
        } else snapshot = snapshotBytes(bytes as Uint8Array, transfer)
      } catch (cause) {
        return resume(Effect.fail(
          new RedisError({ reason: "Connection", message: "Cannot prepare Redis write", cause, outcome: "NotSent" })
        ))
      }
      const writer: Writer = { bytes: snapshot, resume }
      writers.add(writer)
      pump()
      // A synchronous completion leaves no writer to cancel. Backpressured
      // and queued writes retain their interruptible cleanup below.
      if (activeWriter !== writer && !writers.has(writer)) return
      return Effect.sync(() => {
        writers.delete(writer)
        writer.bytes = undefined
        if (activeWriter === writer) activeWriter = undefined
        pump()
      })
    })

  const transport: Transport = {
    run: (onBytes) =>
      Effect.callback<void, RedisError>((resume) => {
        if (consumer !== undefined) {
          return resume(Effect.fail(
            new RedisError({
              reason: "Connection",
              message: "Redis transport already has a consumer",
              outcome: "NotSent"
            })
          ))
        }
        const reading = { onBytes, resume }
        consumer = reading
        if (buffered !== undefined) {
          const bytes = buffered
          buffered = undefined
          deliver(bytes)
        }
        if (failure !== undefined) {
          if (consumer === reading) {
            consumer = undefined
            resume(Effect.fail(failure))
          }
        } else if (socket.isPaused()) socket.resume()
        return Effect.sync(() => {
          if (consumer === reading) {
            consumer = undefined
            socket.pause()
          }
        })
      }),
    write: (bytes, options) =>
      typeof bytes !== "string" ? queuedWrite(bytes, options) : Effect.suspend(() => {
        if (failure !== undefined) return Effect.fail(new RedisError({ ...failure, outcome: "NotSent" }))
        if (pumping || activeWriter !== undefined || writers.size > 0 || socket.writableNeedDrain) {
          return queuedWrite(bytes, options)
        }
        // An idle socket accepts a string synchronously. Keep asynchronous
        // registration and queue entries for writes that actually need them.
        pumping = true
        try {
          socket.write(bytes)
        } catch (cause) {
          fail(new RedisError({ reason: "Connection", message: "Redis write failed", cause, outcome: "Unknown" }))
        } finally {
          pumping = false
        }
        const writeFailure = failure as RedisError | undefined
        if (writeFailure !== undefined) return Effect.fail(new RedisError({ ...writeFailure, outcome: "Unknown" }))
        if (!socket.writableNeedDrain) {
          pump()
          return Effect.void
        }
        // Reserve the accepted write before returning another Effect. Drain,
        // failure, or interruption can run before its callback is evaluated.
        let completed: Effect.Effect<void, RedisError> | undefined
        let waiting: ((effect: Effect.Effect<void, RedisError>) => void) | undefined
        const writer: Writer = {
          bytes: undefined,
          resume: (effect) => {
            if (waiting === undefined) completed = effect
            else waiting(effect)
          }
        }
        activeWriter = writer
        return Effect.callback<void, RedisError>((resume) => {
          if (completed !== undefined) return resume(completed)
          waiting = resume
          return Effect.sync(() => {
            if (activeWriter === writer) activeWriter = undefined
            pump()
          })
        })
      }),
    close: Effect.callback<void>((resume) => {
      // An explicit close discards unread data even after peer EOF. Otherwise a
      // terminal socket event leaves its last owned chunk available to readers.
      buffered = undefined
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

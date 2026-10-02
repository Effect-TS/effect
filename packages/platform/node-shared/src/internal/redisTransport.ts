import type { Connector, Endpoint, Transport } from "@effect/redis/RedisConnection"
import { RedisError } from "@effect/redis/RedisError"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Net from "node:net"
import type { Duplex } from "node:stream"
import * as Tls from "node:tls"

export interface Options {
  readonly connectTimeout?: Duration.Input | undefined
  /** Supplies an already connected Duplex, for tests or custom transports. */
  readonly stream?: ((endpoint: Endpoint) => Duplex) | undefined
}

// Duration inputs coerce NaN to zero, so reject it explicitly.
const hasNaN = (input: unknown): boolean =>
  typeof input === "number"
    ? Number.isNaN(input)
    : typeof input === "object" && input !== null && !Duration.isDuration(input) && Object.values(input).some(hasNaN)

const connectTimeoutMillis = (input: Duration.Input): number | undefined => {
  const millis = Option.map(Duration.fromInput(input), Duration.toMillis)
  return Option.isSome(millis) && millis.value >= 0 && !hasNaN(input) ? millis.value : undefined
}

export const makeConnector = (options: Options = {}): Connector => (endpoint) =>
  Effect.gen(function*() {
    const timeout = connectTimeoutMillis(options.connectTimeout ?? "10 seconds")
    if (timeout === undefined) {
      return yield* Effect.fail(
        new RedisError({ reason: "Timeout", message: "Invalid Redis connection timeout", outcome: "NotSent" })
      )
    }
    const connection = yield* Effect.acquireRelease(
      Effect.try({
        try: () => open(endpoint, options.stream),
        catch: (cause) =>
          new RedisError({ reason: "Connection", message: "Redis socket creation failed", cause, outcome: "NotSent" })
      }),
      (connection) => connection.transport.close
    )
    yield* connection.ready.pipe(
      Effect.timeoutOrElse({
        duration: timeout,
        orElse: () =>
          Effect.fail(new RedisError({ reason: "Timeout", message: "Redis connection timed out", outcome: "NotSent" }))
      })
    )
    return connection.transport
  })

interface Writer {
  readonly bytes: string | Uint8Array
  readonly resume: (effect: Effect.Effect<void, RedisError>) => void
}

const open = (endpoint: Endpoint, stream: Options["stream"]) => {
  const raw = stream === undefined ? new Net.Socket() : undefined
  const tlsOptions = (typeof endpoint.tls === "object" ? endpoint.tls : {}) as Tls.ConnectionOptions
  const socket: Duplex = stream !== undefined
    ? stream(endpoint)
    : endpoint.tls
    ? Tls.connect({
      ...tlsOptions,
      socket: raw,
      ...(Net.isIP(endpoint.host) === 0 ? { servername: tlsOptions.servername ?? endpoint.host } : {})
    })
    : raw!
  raw?.setNoDelay(true)
  // Buffer incoming data inside the socket until a consumer runs.
  socket.pause()

  let connected = stream !== undefined
  let failure: RedisError | undefined
  let consumer: { readonly onBytes: (bytes: Uint8Array) => void; readonly resume: Writer["resume"] } | undefined
  let onConnect: Writer["resume"] | undefined
  const queued: Array<Writer> = []
  // The writer whose bytes the socket accepted but has not yet drained.
  let draining: Writer | undefined

  const fail = (error: RedisError) => {
    if (failure !== undefined) return
    failure = error
    consumer?.resume(Effect.fail(error))
    consumer = undefined
    draining?.resume(Effect.fail(withOutcome(error, "Unknown")))
    draining = undefined
    for (const writer of queued.splice(0)) writer.resume(Effect.fail(withOutcome(error, "NotSent")))
    onConnect?.(Effect.fail(error))
    onConnect = undefined
    socket.destroy()
  }

  const pump = () => {
    while (draining === undefined && queued.length > 0) {
      const writer = queued.shift()!
      let accepted: boolean
      try {
        accepted = socket.write(writer.bytes)
      } catch (cause) {
        draining = writer
        return fail(new RedisError({ reason: "Connection", message: "Redis write failed", cause }))
      }
      if (accepted) writer.resume(Effect.void)
      else draining = writer
    }
  }

  socket.on("data", (chunk: Uint8Array) => {
    try {
      consumer?.onBytes(chunk)
    } catch (cause) {
      fail(
        cause instanceof RedisError
          ? cause
          : new RedisError({ reason: "Connection", message: "Redis byte consumer failed", cause, outcome: "Unknown" })
      )
    }
  })
  socket.on("drain", () => {
    const writer = draining
    draining = undefined
    writer?.resume(Effect.void)
    pump()
  })
  socket.on("error", (cause) => {
    fail(
      new RedisError({
        reason: "Connection",
        message: "Redis socket failed",
        cause,
        outcome: connected ? "Unknown" : "NotSent"
      })
    )
  })
  socket.on(
    "end",
    () => fail(new RedisError({ reason: "Connection", message: "Redis socket ended", outcome: "Unknown" }))
  )
  socket.on("close", () => {
    fail(
      new RedisError({
        reason: "Connection",
        message: "Redis socket closed",
        outcome: connected ? "Unknown" : "NotSent"
      })
    )
  })
  socket.once(endpoint.tls ? "secureConnect" : "connect", () => {
    connected = true
    onConnect?.(Effect.void)
    onConnect = undefined
  })

  const ready = Effect.callback<void, RedisError>((resume) => {
    if (failure !== undefined) return resume(Effect.fail(failure))
    if (connected) return resume(Effect.void)
    onConnect = resume
    try {
      if (endpoint.path !== undefined) raw!.connect(endpoint.path)
      else raw!.connect({ ...tlsOptions, host: endpoint.host, port: endpoint.port })
    } catch (cause) {
      fail(new RedisError({ reason: "Connection", message: "Redis connection failed", cause, outcome: "NotSent" }))
    }
    return Effect.sync(() => {
      onConnect = undefined
    })
  })

  const transport: Transport = {
    write: (bytes) =>
      Effect.callback((resume) => {
        if (failure !== undefined) return resume(Effect.fail(withOutcome(failure, "NotSent")))
        const writer: Writer = { bytes, resume }
        queued.push(writer)
        pump()
        return Effect.sync(() => {
          // A queued write has not reached the socket and can be withdrawn.
          const index = queued.indexOf(writer)
          if (index !== -1) queued.splice(index, 1)
        })
      }),
    run: (onBytes) =>
      Effect.callback((resume) => {
        if (failure !== undefined) return resume(Effect.fail(failure))
        if (consumer !== undefined) {
          return resume(Effect.fail(
            new RedisError({ reason: "Connection", message: "Redis transport already has a consumer" })
          ))
        }
        const reading = { onBytes, resume }
        consumer = reading
        socket.resume()
        return Effect.sync(() => {
          if (consumer !== reading) return
          consumer = undefined
          socket.pause()
        })
      }),
    close: Effect.callback((resume) => {
      if (socket.closed) return resume(Effect.void)
      socket.once("close", () => resume(Effect.void))
      fail(new RedisError({ reason: "Closed", message: "Redis transport closed", outcome: "Unknown" }))
    })
  }
  return { transport, ready }
}

const withOutcome = (error: RedisError, outcome: "NotSent" | "Unknown") =>
  new RedisError({ reason: error.reason, message: error.message, cause: error.cause, code: error.code, outcome })

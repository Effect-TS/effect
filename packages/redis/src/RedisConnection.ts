/**
 * Scoped physical Redis sessions and transport contracts.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Redacted from "effect/Redacted"
import * as Scope from "effect/Scope"
import type * as TransportInternal from "./internal/transport.ts"
import type { Routing } from "./RedisCommand.ts"
import { RedisError } from "./RedisError.ts"
import * as Protocol from "./RedisProtocol.ts"

/**
 * Address of a Redis server, optionally using TLS or a Unix socket.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Endpoint = TransportInternal.Endpoint

/**
 * Scoped byte transport with interruptible reads and writes.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Transport = TransportInternal.Transport

/**
 * Acquires a transport owned by the calling scope.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Connector = TransportInternal.Connector

/**
 * Initialization, timeout, and capacity settings for physical sessions.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Config {
  readonly username?: string | undefined
  readonly password?: string | Redacted.Redacted<string> | Effect.Effect<Redacted.Redacted<string>> | undefined
  readonly database?: number | undefined
  readonly protocol?: 2 | 3 | undefined
  readonly clientName?: string | undefined
  readonly commandTimeout?: Duration.Input | undefined
  readonly maxPendingCommands?: number | undefined
  readonly maxQueuedBytes?: number | undefined
  readonly maxFrameSize?: number | undefined
  readonly maxDepth?: number | undefined
  readonly maxAggregateLength?: number | undefined
}

/**
 * An exclusively owned connection that never reconnects or replays commands.
 *
 * **Gotchas**
 *
 * Connection-local state belongs to this session. A failed session cannot
 * resume a transaction on another connection. Interruption after submission
 * does not establish whether the server executed the command.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface RedisConnection {
  readonly endpoint: Endpoint
  readonly execute: (
    args: ReadonlyArray<Protocol.Argument>,
    routing?: Routing
  ) => Effect.Effect<Protocol.Reply, RedisError>
  readonly close: Effect.Effect<void>
  readonly closed: Effect.Effect<never, RedisError>
  readonly isOpen: () => boolean
  readonly onPush: (listener: (reply: Protocol.Reply) => void) => () => void
}

interface Pending {
  bytes: Uint8Array | undefined
  readonly size: number
  state: "Queued" | "Sent" | "Done"
  readonly ack: string | undefined
  readonly ackChannel: Uint8Array | undefined
  readonly protocol: 2 | 3 | undefined
  readonly reset: boolean
  readonly resume: (effect: Effect.Effect<Protocol.Reply, RedisError>) => void
  canceled: boolean
}

const subscriptionAcks = new Map([
  ["SUBSCRIBE", "subscribe"],
  ["PSUBSCRIBE", "psubscribe"],
  ["SSUBSCRIBE", "ssubscribe"],
  ["UNSUBSCRIBE", "unsubscribe"],
  ["PUNSUBSCRIBE", "punsubscribe"],
  ["SUNSUBSCRIBE", "sunsubscribe"]
])

const encoder = new TextEncoder()
const zero = BigInt(0)
const maxSubscriptionCount = BigInt(Number.MAX_SAFE_INTEGER)

const matchesChannel = (expected: Uint8Array | undefined, reply: Protocol.Reply | undefined): boolean => {
  if (expected === undefined || reply === undefined) return false
  const actual = reply._tag === "BlobString"
    ? reply.value
    : reply._tag === "SimpleString"
    ? encoder.encode(reply.value)
    : undefined
  return actual !== undefined && expected.length === actual.length &&
    expected.every((byte, index) => byte === actual[index])
}

const nameOf = (arg: Protocol.Argument | undefined): string =>
  typeof arg === "string" ? arg : arg === undefined ? "" : new TextDecoder().decode(arg)

/**
 * Acquires and initializes a physical connection using an injected transport.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(connector: Connector, endpoint: Endpoint, config: Config = {}) {
  const limit = config.maxPendingCommands ?? 4096
  const byteLimit = config.maxQueuedBytes ?? 16 * 1024 * 1024
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(byteLimit) || byteLimit < 1) {
    return yield* Effect.fail(
      new RedisError({ reason: "Capacity", message: "Redis capacities must be positive integers", outcome: "NotSent" })
    )
  }
  const parser = yield* Effect.try({
    try: () => Protocol.makeParser(config),
    catch: (cause) =>
      new RedisError({ reason: "Protocol", message: "Invalid Redis parser configuration", cause, outcome: "NotSent" })
  })
  const timeout = yield* Effect.try({
    try: () => config.commandTimeout === undefined ? undefined : Duration.toMillis(config.commandTimeout),
    catch: () => new RedisError({ reason: "Timeout", message: "Invalid Redis command timeout", outcome: "NotSent" })
  })
  const invalidTimeoutInput = Number.isNaN(config.commandTimeout) ||
    (typeof config.commandTimeout === "object" && !Duration.isDuration(config.commandTimeout) &&
      Object.values(config.commandTimeout).some(Number.isNaN))
  if (invalidTimeoutInput || (timeout !== undefined && (Number.isNaN(timeout) || timeout < 0))) {
    return yield* Effect.fail(
      new RedisError({ reason: "Timeout", message: "Invalid Redis command timeout", outcome: "NotSent" })
    )
  }
  const transport = yield* connector(endpoint)
  const outgoing = yield* Queue.bounded<Pending, RedisError>(limit)
  const terminal = yield* Deferred.make<never, RedisError>()
  const pending = new Set<Pending>()
  const inflight: Array<Pending> = []
  const listeners = new Set<(reply: Protocol.Reply) => void>()
  let dead: RedisError | undefined
  let queuedBytes = 0
  let subscriptions = 0
  let shardSubscriptions = 0
  let protocol = config.protocol ?? 2

  const settle = (entry: Pending, result: Effect.Effect<Protocol.Reply, RedisError>) => {
    if (entry.state === "Done") return
    if (entry.bytes !== undefined) queuedBytes -= entry.size
    entry.bytes = undefined
    entry.state = "Done"
    pending.delete(entry)
    if (!entry.canceled) entry.resume(result)
  }
  const fatal = (error: RedisError) => {
    if (dead !== undefined) return
    dead = error
    for (const entry of pending) {
      settle(
        entry,
        Effect.fail(
          new RedisError({
            reason: error.reason,
            message: error.message,
            cause: error.cause,
            code: error.code,
            outcome: entry.state === "Sent" ? "Unknown" : "NotSent"
          })
        )
      )
    }
    inflight.length = 0
    listeners.clear()
    Queue.failCauseUnsafe(outgoing, Cause.fail(error))
    Deferred.doneUnsafe(terminal, Effect.fail(error))
  }
  const close = Effect.sync(() => fatal(new RedisError({ reason: "Closed", message: "Redis connection closed" }))).pipe(
    Effect.andThen(transport.close)
  )
  yield* Scope.addFinalizer(yield* Effect.scope, close)

  const execute = (args: ReadonlyArray<Protocol.Argument>): Effect.Effect<Protocol.Reply, RedisError> =>
    Effect.suspend(() => {
      let submitted = false
      const operation = Effect.callback<Protocol.Reply, RedisError>((resume) => {
        if (dead !== undefined) {
          resume(
            Effect.fail(
              new RedisError({ reason: "Closed", message: "Redis connection is unavailable", outcome: "NotSent" })
            )
          )
          return
        }
        const command = nameOf(args[0]).toUpperCase()
        if (
          args.length === 0 || command === "MONITOR" || command === "QUIT" ||
          (command === "CLIENT" && nameOf(args[1]).toUpperCase() === "REPLY")
        ) {
          resume(
            Effect.fail(
              new RedisError({
                reason: "Routing",
                message: "Command requires a different Redis connection mode",
                outcome: "NotSent"
              })
            )
          )
          return
        }
        if (subscriptionAcks.has(command) && args.length !== 2) {
          resume(
            Effect.fail(
              new RedisError({
                reason: "Routing",
                message: "Submit one subscription channel per command",
                outcome: "NotSent"
              })
            )
          )
          return
        }
        let bytes: Uint8Array
        try {
          bytes = Protocol.encode(args)
        } catch (cause) {
          resume(
            Effect.fail(
              cause instanceof RedisError
                ? cause
                : new RedisError({
                  reason: "Protocol",
                  message: "Cannot encode Redis command",
                  cause,
                  outcome: "NotSent"
                })
            )
          )
          return
        }
        if (pending.size >= limit || queuedBytes + bytes.length > byteLimit) {
          resume(
            Effect.fail(
              new RedisError({
                reason: "Capacity",
                message: "Redis command queue capacity exceeded",
                outcome: "NotSent"
              })
            )
          )
          return
        }
        const selectedProtocol = command === "RESET"
          ? 2
          : command === "HELLO" && nameOf(args[1]) === "2"
          ? 2
          : command === "HELLO" && nameOf(args[1]) === "3"
          ? 3
          : undefined
        const entry: Pending = {
          bytes,
          size: bytes.length,
          state: "Queued",
          ack: subscriptionAcks.get(command),
          ackChannel: subscriptionAcks.has(command)
            ? typeof args[1] === "string" ? encoder.encode(args[1]) : Uint8Array.from(args[1])
            : undefined,
          protocol: selectedProtocol,
          reset: command === "RESET",
          resume,
          canceled: false
        }
        pending.add(entry)
        queuedBytes += bytes.length
        if (!Queue.offerUnsafe(outgoing, entry)) {
          settle(
            entry,
            Effect.fail(
              new RedisError({
                reason: "Capacity",
                message: "Redis dispatch queue capacity exceeded",
                outcome: "NotSent"
              })
            )
          )
        }
        // Read by the timeout branch after interruption has run this finalizer.
        return Effect.sync(() => {
          submitted = entry.state === "Sent"
          entry.canceled = true
          if (entry.state === "Queued") {
            settle(
              entry,
              Effect.fail(
                new RedisError({ reason: "Closed", message: "Redis command interrupted", outcome: "NotSent" })
              )
            )
          }
        })
      })
      return timeout === undefined ? operation : Effect.timeoutOrElse(operation, {
        duration: timeout,
        orElse: () =>
          Effect.fail(
            new RedisError({
              reason: "Timeout",
              message: "Redis command timed out",
              outcome: submitted ? "Unknown" : "NotSent"
            })
          )
      })
    })

  const failCause = (cause: Cause.Cause<RedisError>) => {
    const error = Cause.squash(cause)
    return Effect.sync(() =>
      fatal(
        error instanceof RedisError
          ? error
          : new RedisError({ reason: "Connection", message: "Redis connection failed", cause: error })
      )
    ).pipe(
      Effect.andThen(transport.close)
    )
  }
  yield* Effect.forkScoped(
    Effect.forever(
      Queue.take(outgoing).pipe(Effect.flatMap((entry) => {
        if (entry.state === "Done") return Effect.void
        const bytes = entry.bytes!
        entry.bytes = undefined
        queuedBytes -= entry.size
        entry.state = "Sent"
        inflight.push(entry)
        return transport.write(bytes)
      }))
    ).pipe(Effect.catchCause(failCause))
  )

  const receive = (reply: Protocol.Reply) => {
    let value = reply
    while (value._tag === "Attribute") value = value.value
    const values = value._tag === "Push" || value._tag === "Array" ? value.values : undefined
    const first = values?.[0]
    const kind = first?._tag === "SimpleString"
      ? first.value
      : first?._tag === "BlobString"
      ? new TextDecoder().decode(first.value)
      : undefined
    const ack = typeof kind === "string" && [...subscriptionAcks.values()].includes(kind) &&
      (value._tag === "Push" ||
        (protocol === 2 && (subscriptions + shardSubscriptions > 0 || inflight[0]?.ack === kind)))
    const message = protocol === 2 && subscriptions + shardSubscriptions > 0 &&
      (kind === "message" || kind === "pmessage" || kind === "smessage")
    if (value._tag === "Push" || ack || message) {
      if (ack) {
        const channel = values?.[1]
        const count = values?.[2]
        if (
          values?.length !== 3 || (channel?._tag !== "BlobString" && channel?._tag !== "SimpleString") ||
          count?._tag !== "Integer" || count.value < zero || count.value > maxSubscriptionCount
        ) {
          throw new RedisError({ reason: "Protocol", message: "Invalid Redis subscription acknowledgement" })
        }
        // Redis reports independent counts for global and sharded subscriptions.
        if (kind === "ssubscribe" || kind === "sunsubscribe") shardSubscriptions = Number(count.value)
        else subscriptions = Number(count.value)
      }
      if (ack && inflight[0]?.ack === kind && matchesChannel(inflight[0].ackChannel, values?.[1])) {
        settle(inflight.shift()!, Effect.succeed(reply))
      }
      for (const listener of listeners) listener(reply)
      return
    }
    const entry = inflight.shift()
    if (entry === undefined) {
      throw new RedisError({ reason: "Protocol", message: "Unexpected Redis reply without a command" })
    }
    if (value._tag !== "Error" && entry.protocol !== undefined) protocol = entry.protocol
    if (value._tag !== "Error" && entry.reset) {
      subscriptions = 0
      shardSubscriptions = 0
    }
    settle(
      entry,
      value._tag === "Error"
        ? Effect.fail(new RedisError({ reason: "Server", message: value.message, code: value.code }))
        : Effect.succeed(reply)
    )
  }
  yield* Effect.forkScoped(
    Effect.forever(transport.read.pipe(Effect.flatMap((bytes) =>
      Effect.try({
        try: () => {
          for (const reply of parser.push(bytes)) receive(reply)
        },
        catch: (cause) =>
          cause instanceof RedisError
            ? cause
            : new RedisError({ reason: "Protocol", message: "Invalid Redis response", cause })
      })
    ))).pipe(Effect.catchCause((cause) => {
      const error = Cause.squash(cause)
      if (error instanceof RedisError && (error.reason === "Connection" || error.reason === "Closed")) {
        try {
          parser.end()
        } catch (failure) {
          return failCause(Cause.fail(
            failure instanceof RedisError
              ? failure
              : new RedisError({ reason: "Protocol", message: "Redis reply ended prematurely", cause: failure })
          ))
        }
      }
      return failCause(cause)
    }))
  )

  const connection: RedisConnection = {
    endpoint,
    execute,
    close,
    closed: Deferred.await(terminal),
    isOpen: () => dead === undefined,
    onPush: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
  yield* Effect.gen(function*() {
    const password = config.password === undefined ? undefined : Effect.isEffect(config.password)
      ? Redacted.value(yield* config.password)
      : Redacted.isRedacted(config.password)
      ? Redacted.value(config.password)
      : config.password
    if (password !== undefined) {
      yield* execute(config.username === undefined ? ["AUTH", password] : ["AUTH", config.username, password])
    }
    if (config.protocol === 3) yield* execute(["HELLO", "3"])
    if (config.database !== undefined && config.database !== 0) yield* execute(["SELECT", String(config.database)])
    if (config.clientName !== undefined) yield* execute(["CLIENT", "SETNAME", config.clientName])
  }).pipe(
    Effect.timeoutOrElse({
      duration: config.commandTimeout ?? "10 seconds",
      orElse: () =>
        Effect.fail(
          new RedisError({ reason: "Timeout", message: "Redis initialization timed out", outcome: "Unknown" })
        )
    }),
    Effect.onError(() => close)
  )
  return connection
})

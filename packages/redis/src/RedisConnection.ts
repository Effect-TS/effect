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
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Scope from "effect/Scope"
import * as ConnectionInternal from "./internal/connection.ts"
import { encodeFrame, encodeFrames } from "./internal/encoding.ts"
import { makeParser } from "./internal/protocol.ts"
import * as Replies from "./internal/replies.ts"
import type * as TransportInternal from "./internal/transport.ts"
import type { Routing } from "./RedisCommand.ts"
import { RedisError } from "./RedisError.ts"
import type * as Protocol from "./RedisProtocol.ts"

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
 * **Details**
 *
 * Strings are written as UTF-8. Byte writes copy their input by default. With
 * `ownership: "transfer"`, callers promise never to mutate the supplied bytes,
 * and transports may retain them without copying. Transports must not modify
 * those bytes in either mode.
 * `run` delivers stable byte ranges synchronously to one scoped consumer.
 * Transports must never mutate or reuse delivered bytes. Producers that reuse
 * their buffers must copy before delivery. Interruption unregisters the consumer;
 * callback exceptions fail `run` and close the transport.
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
  /** Submits commands in order without waiting for individual replies. */
  readonly pipeline: (
    commands: ReadonlyArray<{
      readonly arguments: ReadonlyArray<Protocol.Argument>
      readonly routing?: Routing | undefined
    }>
  ) => Effect.Effect<Array<Result.Result<Protocol.Reply, RedisError>>, RedisError>
  readonly close: Effect.Effect<void>
  readonly closed: Effect.Effect<never, RedisError>
  readonly isOpen: () => boolean
  readonly onPush: (listener: (reply: Protocol.Reply) => void) => () => void
}

interface Pending {
  bytes: string | Uint8Array | undefined
  readonly size: number
  state: "Queued" | "Sent" | "Done"
  readonly ack: string | undefined
  readonly ackChannel: Uint8Array | undefined
  readonly protocol: 2 | 3 | undefined
  readonly reset: boolean
  readonly resume: (result: Result.Result<Protocol.Reply, RedisError>) => void
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
const subscriptionAckKinds = new Set(subscriptionAcks.values())

const encoder = new TextEncoder()
const transferredWrite = { ownership: "transfer" } as const
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
    try: () => makeParser(config, "transfer"),
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
  let outgoing: Array<Pending> = []
  const terminal = yield* Deferred.make<never, RedisError>()
  const pending = new Set<Pending>()
  const inflight: Array<Pending | undefined> = []
  let inflightHead = 0
  const firstInflight = () => inflight[inflightHead]
  const takeInflight = () => {
    const entry = inflight[inflightHead]
    if (entry === undefined) return undefined
    inflight[inflightHead] = undefined
    inflightHead++
    if (inflightHead === inflight.length) {
      inflight.length = 0
      inflightHead = 0
    } else if (inflightHead >= 1024 && inflightHead * 2 >= inflight.length) {
      inflight.splice(0, inflightHead)
      inflightHead = 0
    }
    return entry
  }
  const listeners = new Set<(reply: Protocol.Reply) => void>()
  let dead: RedisError | undefined
  let queuedBytes = 0
  let subscriptions = 0
  let shardSubscriptions = 0
  let protocol = config.protocol ?? 2
  let writer: ((effect: Effect.Effect<Array<Pending>, RedisError>) => void) | undefined
  const takeOutgoing = Effect.callback<Array<Pending>, RedisError>((resume) => {
    if (dead !== undefined) return resume(Effect.fail(dead))
    if (outgoing.length > 0) {
      const entries = outgoing
      outgoing = []
      return resume(Effect.succeed(entries))
    }
    writer = resume
    return Effect.sync(() => {
      if (writer === resume) writer = undefined
    })
  })
  let flushScheduled = false
  const wakeWriter = () => {
    if (flushScheduled) return
    flushScheduled = true
    // Coalesce this turn's complete submissions before resuming the scoped writer.
    queueMicrotask(() => {
      flushScheduled = false
      if (writer === undefined || outgoing.length === 0) return
      const resume = writer
      const entries = outgoing
      writer = undefined
      outgoing = []
      resume(Effect.succeed(entries))
    })
  }

  const settle = (entry: Pending, result: Result.Result<Protocol.Reply, RedisError>) => {
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
        Result.fail(
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
    inflightHead = 0
    listeners.clear()
    outgoing = []
    const resume = writer
    writer = undefined
    resume?.(Effect.fail(error))
    Deferred.doneUnsafe(terminal, Effect.fail(error))
  }
  const close = Effect.sync(() => fatal(new RedisError({ reason: "Closed", message: "Redis connection closed" }))).pipe(
    Effect.andThen(transport.close)
  )
  yield* Scope.addFinalizer(yield* Effect.scope, close)

  const prepare = (
    args: ReadonlyArray<Protocol.Argument>,
    frame: ReturnType<typeof encodeFrame>,
    onResult?: (result: Result.Result<Protocol.Reply, RedisError>) => void
  ) => {
    const command = nameOf(args[0]).toUpperCase()
    if (
      args.length === 0 || command === "MONITOR" || command === "QUIT" ||
      (command === "CLIENT" && nameOf(args[1]).toUpperCase() === "REPLY")
    ) {
      throw new RedisError({
        reason: "Routing",
        message: "Command requires a different Redis connection mode",
        outcome: "NotSent"
      })
    }
    if (subscriptionAcks.has(command) && args.length !== 2) {
      throw new RedisError({
        reason: "Routing",
        message: "Submit one subscription channel per command",
        outcome: "NotSent"
      })
    }
    const result = onResult === undefined ? Deferred.makeUnsafe<Protocol.Reply, RedisError>() : undefined
    const entry: Pending = {
      bytes: frame.bytes,
      size: frame.size,
      state: "Queued",
      ack: subscriptionAcks.get(command),
      ackChannel: subscriptionAcks.has(command)
        ? typeof args[1] === "string" ? encoder.encode(args[1]) : Uint8Array.from(args[1])
        : undefined,
      protocol: command === "RESET"
        ? 2
        : command === "HELLO" && nameOf(args[1]) === "2"
        ? 2
        : command === "HELLO" && nameOf(args[1]) === "3"
        ? 3
        : undefined,
      reset: command === "RESET",
      resume: onResult ?? ((value) => {
        Deferred.doneUnsafe(
          result!,
          value._tag === "Success" ? Effect.succeed(value.success) : Effect.fail(value.failure)
        )
      }),
      canceled: false
    }
    return { entry, result }
  }
  const encodingError = (cause: unknown) =>
    cause instanceof RedisError
      ? cause
      : new RedisError({ reason: "Protocol", message: "Cannot encode Redis command", cause, outcome: "NotSent" })
  const submitOneUnsafe = (
    args: ReadonlyArray<Protocol.Argument>,
    onResult?: (result: Result.Result<Protocol.Reply, RedisError>) => void
  ) => {
    if (dead !== undefined) {
      throw new RedisError({ reason: "Closed", message: "Redis connection is unavailable", outcome: "NotSent" })
    }
    const item = prepare(args, encodeFrame(args), onResult)
    if (pending.size >= limit || queuedBytes + item.entry.size > byteLimit || outgoing.length >= limit) {
      throw new RedisError({ reason: "Capacity", message: "Redis command queue capacity exceeded", outcome: "NotSent" })
    }
    pending.add(item.entry)
    queuedBytes += item.entry.size
    outgoing.push(item.entry)
    wakeWriter()
    return item
  }
  const submitUnsafe = (
    commands: ReadonlyArray<ReadonlyArray<Protocol.Argument>>,
    onResult?: (result: Result.Result<Protocol.Reply, RedisError>, index: number) => void
  ) => {
    if (dead !== undefined) {
      throw new RedisError({ reason: "Closed", message: "Redis connection is unavailable", outcome: "NotSent" })
    }
    // Admission is atomic: local validation or capacity failures never submit
    // only part of a batch, particularly a MULTI/EXEC transaction.
    const frames = encodeFrames(commands)
    const prepared = commands.map((args, index) =>
      prepare(args, frames[index], onResult === undefined ? undefined : (result) => onResult(result, index))
    )
    const size = prepared.reduce((total, item) => total + item.entry.size, 0)
    if (
      pending.size + prepared.length > limit || queuedBytes + size > byteLimit ||
      outgoing.length + prepared.length > limit
    ) {
      throw new RedisError({
        reason: "Capacity",
        message: "Redis command queue capacity exceeded",
        outcome: "NotSent"
      })
    }
    for (const item of prepared) pending.add(item.entry)
    queuedBytes += size
    for (const item of prepared) outgoing.push(item.entry)
    wakeWriter()
    return prepared
  }
  const submit = (
    commands: ReadonlyArray<ReadonlyArray<Protocol.Argument>>,
    onResult?: (result: Result.Result<Protocol.Reply, RedisError>, index: number) => void
  ) =>
    Effect.try({
      try: () => submitUnsafe(commands, onResult),
      catch: encodingError
    })
  const cancel = (entry: Pending) => {
    entry.canceled = true
    if (entry.state === "Queued") {
      settle(
        entry,
        Result.fail(new RedisError({ reason: "Closed", message: "Redis command interrupted", outcome: "NotSent" }))
      )
    }
  }
  const awaitReply = (item: ReturnType<typeof prepare>): Effect.Effect<Protocol.Reply, RedisError> =>
    Effect.suspend(() => {
      let submitted = false
      const operation = Deferred.await(item.result!).pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            submitted = item.entry.state === "Sent"
            cancel(item.entry)
          })
        )
      )
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
  const execute = (args: ReadonlyArray<Protocol.Argument>): Effect.Effect<Protocol.Reply, RedisError> =>
    timeout === undefined ?
      Effect.callback((resume) => {
        try {
          const item = submitOneUnsafe(args, (result) => {
            resume(result._tag === "Success" ? Effect.succeed(result.success) : Effect.fail(result.failure))
          })
          return Effect.sync(() => cancel(item.entry))
        } catch (cause) {
          resume(Effect.fail(encodingError(cause)))
        }
      }) :
      Effect.uninterruptibleMask((restore) =>
        Effect.try({ try: () => submitOneUnsafe(args), catch: encodingError }).pipe(
          Effect.flatMap((item) => restore(awaitReply(item)))
        )
      )
  const pipeline: RedisConnection["pipeline"] = (commands) =>
    timeout === undefined ?
      Effect.callback((resume) => {
        if (commands.length === 0) return resume(Effect.succeed([]))
        try {
          const results = new Array<Result.Result<Protocol.Reply, RedisError>>(commands.length)
          let remaining = commands.length
          const items = submitUnsafe(commands.map((command) => command.arguments), (result, index) => {
            results[index] = result
            if (--remaining === 0) resume(Effect.succeed(results))
          })
          return Effect.sync(() => {
            for (const item of items) cancel(item.entry)
          })
        } catch (cause) {
          resume(Effect.fail(encodingError(cause)))
        }
      }) :
      Effect.uninterruptibleMask((restore) =>
        submit(commands.map((command) => command.arguments)).pipe(
          Effect.flatMap((items) =>
            restore(Effect.forEach(items, (item) => Effect.result(awaitReply(item)), { concurrency: "unbounded" }))
              .pipe(
                Effect.onInterrupt(() =>
                  Effect.sync(() => {
                    for (const item of items) cancel(item.entry)
                  })
                )
              )
          )
        )
      )

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
      takeOutgoing.pipe(Effect.flatMap((entries) => {
        if (entries.length === 1) {
          const entry = entries[0]
          if (entry.state === "Done") return Effect.void
          const bytes = entry.bytes!
          entry.bytes = undefined
          queuedBytes -= entry.size
          entry.state = "Sent"
          inflight.push(entry)
          return transport.write(bytes, transferredWrite)
        }
        const active = entries.filter((entry) => entry.state !== "Done")
        if (active.length === 0) return Effect.void
        const first = active[0].bytes!
        let size = 0
        let contiguous = typeof first !== "string"
        let allStrings = typeof first === "string"
        for (const entry of active) {
          const bytes = entry.bytes!
          if (typeof bytes === "string") contiguous = false
          else {
            allStrings = false
            if (
              typeof first === "string" || bytes.buffer !== first.buffer || bytes.byteOffset !== first.byteOffset + size
            ) {
              contiguous = false
            }
          }
          size += entry.size
        }
        const bytes = allStrings
          ? active.map((entry) => entry.bytes as string).join("")
          : contiguous && typeof first !== "string"
          ? active.length === 1 ? first : new Uint8Array(first.buffer, first.byteOffset, size)
          : new Uint8Array(size)
        let offset = 0
        for (const entry of active) {
          if (!allStrings && !contiguous && typeof bytes !== "string") {
            const frame = entry.bytes!
            if (typeof frame === "string") encoder.encodeInto(frame, bytes.subarray(offset, offset + entry.size))
            else bytes.set(frame, offset)
          }
          offset += entry.size
          entry.bytes = undefined
          queuedBytes -= entry.size
          entry.state = "Sent"
          inflight.push(entry)
        }
        return transport.write(bytes, transferredWrite)
      }))
    ).pipe(Effect.catchCause(failCause))
  )

  const receive = (reply: Protocol.Reply) => {
    let value = reply
    while (value._tag === "Attribute") value = value.value
    const values = value._tag === "Push" ||
        (value._tag === "Array" && protocol === 2 &&
          (subscriptions + shardSubscriptions > 0 || firstInflight()?.ack !== undefined))
      ? value.values
      : undefined
    const first = values?.[0]
    const kind = first?._tag === "SimpleString"
      ? first.value
      : first?._tag === "BlobString"
      ? new TextDecoder().decode(first.value)
      : undefined
    const ack = typeof kind === "string" && subscriptionAckKinds.has(kind) &&
      (value._tag === "Push" ||
        (protocol === 2 && (subscriptions + shardSubscriptions > 0 || firstInflight()?.ack === kind)))
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
      if (ack && firstInflight()?.ack === kind && matchesChannel(firstInflight()!.ackChannel, values?.[1])) {
        settle(takeInflight()!, Result.succeed(reply))
      }
      for (const listener of listeners) listener(reply)
      return
    }
    const entry = takeInflight()
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
        ? Result.fail(new RedisError({ reason: "Server", message: value.message, code: value.code }))
        : Replies.succeed(reply)
    )
  }
  yield* Effect.forkScoped(
    transport.run((bytes) => {
      try {
        for (const reply of parser.push(bytes)) receive(reply)
      } catch (cause) {
        throw cause instanceof RedisError
          ? cause
          : new RedisError({ reason: "Protocol", message: "Invalid Redis response", cause })
      }
    }).pipe(Effect.catchCause((cause) => {
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
    pipeline,
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
  if (timeout === undefined) {
    ConnectionInternal.register(connection, (args, onResult) => {
      const { entry } = submitOneUnsafe(args, onResult)
      return () => cancel(entry)
    })
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

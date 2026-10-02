/**
 * Scoped physical Redis sessions and transport contracts.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Scope from "effect/Scope"
import * as Protocol from "./internal/protocol.ts"
import * as Internal from "./internal/transport.ts"
import type { Routing } from "./RedisCommand.ts"
import { RedisError } from "./RedisError.ts"
import type { Argument, Reply } from "./RedisProtocol.ts"

/**
 * Address of a Redis server, optionally using TLS or a Unix socket.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Endpoint = Internal.Endpoint

/**
 * Scoped byte transport.
 *
 * **Details**
 *
 * `write` resolves once the transport has accepted the bytes. The caller must
 * not mutate them afterwards. `run` delivers received bytes synchronously to a
 * single consumer until the transport fails or closes; exceptions thrown by
 * the consumer fail `run` and close the transport.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Transport = Internal.Transport

/**
 * Acquires a transport owned by the calling scope.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type Connector = Internal.Connector

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
 * Connection-local state belongs to this session. Interrupting or timing out
 * a command after it was written does not establish whether the server
 * executed it.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface RedisConnection {
  readonly endpoint: Endpoint
  readonly execute: (args: ReadonlyArray<Argument>, routing?: Routing) => Effect.Effect<Reply, RedisError>
  /** Writes the commands together and collects one result per command. */
  readonly pipeline: (
    commands: ReadonlyArray<{
      readonly arguments: ReadonlyArray<Argument>
      readonly routing?: Routing | undefined
    }>
  ) => Effect.Effect<Array<Result.Result<Reply, RedisError>>, RedisError>
  readonly close: Effect.Effect<void>
  /** Fails with the error that ended the connection. */
  readonly closed: Effect.Effect<never, RedisError>
  readonly isOpen: () => boolean
  /** Receives RESP3 pushes and RESP2 Pub/Sub messages. */
  readonly onPush: (listener: (reply: Reply) => void) => () => void
}

interface Entry {
  readonly bytes: Uint8Array
  readonly subscription: { readonly kind: string; readonly channel: Uint8Array } | undefined
  readonly protocol: 2 | 3 | undefined
  readonly reset: boolean
  readonly onResult: (result: Result.Result<Reply, RedisError>) => void
  sent: boolean
  done: boolean
  canceled: boolean
}

const subscriptionCommands = new Set([
  "SUBSCRIBE",
  "PSUBSCRIBE",
  "SSUBSCRIBE",
  "UNSUBSCRIBE",
  "PUNSUBSCRIBE",
  "SUNSUBSCRIBE"
])
const subscriptionKinds = new Set([
  "subscribe",
  "psubscribe",
  "ssubscribe",
  "unsubscribe",
  "punsubscribe",
  "sunsubscribe"
])
const messageKinds = new Set(["message", "pmessage", "smessage"])

const encoder = new TextEncoder()

const bytesOf = (reply: Reply | undefined): Uint8Array | undefined =>
  reply?._tag === "BlobString"
    ? reply.value
    : reply?._tag === "SimpleString"
    ? encoder.encode(reply.value)
    : undefined

const sameBytes = (left: Uint8Array, right: Uint8Array | undefined): boolean =>
  right !== undefined && left.length === right.length && left.every((byte, index) => byte === right[index])

const unwrap = (reply: Reply): Reply => {
  while (reply._tag === "Attribute") reply = reply.value
  return reply
}

const toError = (cause: unknown, message: string): RedisError =>
  cause instanceof RedisError ? cause : new RedisError({ reason: "Protocol", message, cause, outcome: "NotSent" })

const prepare = (
  args: ReadonlyArray<Argument>,
  onResult: Entry["onResult"]
): Entry => {
  const command = Internal.argumentText(args[0]).toUpperCase()
  const subcommand = Internal.argumentText(args[1]).toUpperCase()
  if (
    args.length === 0 || command === "MONITOR" || command === "QUIT" || (command === "CLIENT" && subcommand === "REPLY")
  ) {
    throw Internal.notSent("Routing", "Command requires a different Redis connection mode")
  }
  let subscription: Entry["subscription"]
  if (subscriptionCommands.has(command)) {
    if (args.length !== 2) throw Internal.notSent("Routing", "Submit one subscription channel per command")
    const channel = args[1]
    subscription = {
      kind: command.toLowerCase(),
      channel: typeof channel === "string" ? encoder.encode(channel) : channel.slice()
    }
  }
  return {
    bytes: Protocol.encode(args),
    subscription,
    protocol: command === "RESET" || (command === "HELLO" && subcommand === "2")
      ? 2
      : command === "HELLO" && subcommand === "3"
      ? 3
      : undefined,
    reset: command === "RESET",
    onResult,
    sent: false,
    done: false,
    canceled: false
  }
}

const concat = (entries: ReadonlyArray<Entry>): Uint8Array => {
  if (entries.length === 1) return entries[0].bytes
  const bytes = new Uint8Array(entries.reduce((size, entry) => size + entry.bytes.length, 0))
  let offset = 0
  for (const entry of entries) {
    bytes.set(entry.bytes, offset)
    offset += entry.bytes.length
  }
  return bytes
}

/**
 * Acquires and initializes a physical connection using an injected transport.
 *
 * **Details**
 *
 * Authenticates, selects RESP3, the database, and the client name before
 * returning. Commands submitted together are written in one batch.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(connector: Connector, endpoint: Endpoint, config: Config = {}) {
  const maxPending = config.maxPendingCommands ?? 4096
  const maxQueuedBytes = config.maxQueuedBytes ?? 16 * 1024 * 1024
  if (
    !Number.isSafeInteger(maxPending) || maxPending < 1 || !Number.isSafeInteger(maxQueuedBytes) || maxQueuedBytes < 1
  ) {
    return yield* Effect.fail(Internal.notSent("Capacity", "Redis capacities must be positive integers"))
  }
  const parser = yield* Effect.try({
    try: () => Protocol.makeParser(config),
    catch: (cause) => Internal.notSent("Protocol", "Invalid Redis parser configuration", cause)
  })
  const timeout = config.commandTimeout === undefined ? undefined : Internal.durationMillis(config.commandTimeout)
  if (config.commandTimeout !== undefined && (timeout === undefined || timeout < 0)) {
    return yield* Effect.fail(Internal.notSent("Timeout", "Invalid Redis command timeout"))
  }

  const transport = yield* connector(endpoint)
  const outgoing = yield* Queue.unbounded<Entry, RedisError>()
  const terminal = Deferred.makeUnsafe<never, RedisError>()
  const unsettled = new Set<Entry>()
  // Entries written to the transport, in reply order.
  let inflight: Array<Entry> = []
  let inflightHead = 0
  const listeners = new Set<(reply: Reply) => void>()
  let failure: RedisError | undefined
  let queuedBytes = 0
  let protocol = config.protocol ?? 2
  let subscriptions = 0
  let shardSubscriptions = 0

  const settle = (entry: Entry, result: Result.Result<Reply, RedisError>) => {
    if (entry.done) return
    entry.done = true
    unsettled.delete(entry)
    if (!entry.sent) queuedBytes -= entry.bytes.length
    if (!entry.canceled) entry.onResult(result)
  }

  const cancel = (entry: Entry) => {
    entry.canceled = true
    // Written commands stay in flight so that their replies are consumed.
    if (!entry.sent) settle(entry, Result.fail(Internal.notSent("Closed", "Redis command interrupted")))
  }

  const fail = (error: RedisError) => {
    if (failure !== undefined) return
    failure = error
    for (const entry of unsettled) {
      settle(entry, Result.fail(Internal.withOutcome(error, entry.sent ? "Unknown" : "NotSent")))
    }
    inflight = []
    inflightHead = 0
    listeners.clear()
    Queue.failCauseUnsafe(outgoing, Cause.fail(error))
    Deferred.doneUnsafe(terminal, Effect.fail(error))
  }

  const close = Effect.suspend(() => {
    fail(new RedisError({ reason: "Closed", message: "Redis connection closed" }))
    return transport.close
  })
  yield* Scope.addFinalizer(yield* Effect.scope, close)

  const failWith = (cause: Cause.Cause<unknown>) => {
    const error = Cause.squash(cause)
    fail(
      error instanceof RedisError
        ? error
        : new RedisError({ reason: "Connection", message: "Redis connection failed", cause: error })
    )
    return transport.close
  }

  const submit = (
    commands: ReadonlyArray<ReadonlyArray<Argument>>,
    onResult: (index: number, result: Result.Result<Reply, RedisError>) => void
  ): ReadonlyArray<Entry> => {
    if (failure !== undefined) throw Internal.notSent("Closed", "Redis connection is unavailable")
    const entries = commands.map((args, index) => prepare(args, (result) => onResult(index, result)))
    const size = entries.reduce((total, entry) => total + entry.bytes.length, 0)
    if (unsettled.size + entries.length > maxPending || queuedBytes + size > maxQueuedBytes) {
      throw Internal.notSent("Capacity", "Redis command queue capacity exceeded")
    }
    queuedBytes += size
    for (const entry of entries) unsettled.add(entry)
    Queue.offerAllUnsafe(outgoing, entries)
    return entries
  }

  const run = (
    commands: ReadonlyArray<ReadonlyArray<Argument>>
  ): Effect.Effect<Array<Result.Result<Reply, RedisError>>, RedisError> =>
    Effect.suspend(() => {
      const results = new Array<Result.Result<Reply, RedisError>>(commands.length)
      if (commands.length === 0) return Effect.succeed(results)
      let remaining = commands.length
      let notify: (() => void) | undefined
      let entries: ReadonlyArray<Entry>
      try {
        entries = submit(commands, (index, result) => {
          results[index] = result
          if (--remaining === 0) notify?.()
        })
      } catch (cause) {
        return Effect.fail(toError(cause, "Cannot encode Redis command"))
      }
      const replies = Effect.callback<void>((resume) => {
        if (remaining === 0) return resume(Effect.void)
        notify = () => resume(Effect.void)
        return Effect.sync(() => {
          for (const entry of entries) cancel(entry)
        })
      })
      const timed = timeout === undefined ? replies : Effect.timeoutOrElse(replies, {
        duration: timeout,
        orElse: () =>
          Effect.sync(() => {
            entries.forEach((entry, index) => {
              results[index] ??= Result.fail(
                new RedisError({
                  reason: "Timeout",
                  message: "Redis command timed out",
                  outcome: entry.sent ? "Unknown" : "NotSent"
                })
              )
            })
          })
      })
      return Effect.as(timed, results)
    })

  const execute = (args: ReadonlyArray<Argument>): Effect.Effect<Reply, RedisError> =>
    Effect.flatMap(run([args]), (results) => Effect.fromResult(results[0]))

  yield* Queue.takeAll(outgoing).pipe(
    Effect.flatMap((batch) => {
      const entries = batch.filter((entry) => !entry.done)
      if (entries.length === 0) return Effect.void
      for (const entry of entries) {
        entry.sent = true
        queuedBytes -= entry.bytes.length
        inflight.push(entry)
      }
      return transport.write(concat(entries))
    }),
    Effect.forever,
    Effect.catchCause(failWith),
    Effect.forkScoped
  )

  const nextInflight = (): Entry | undefined => inflight[inflightHead]

  const takeInflight = (): Entry | undefined => {
    const entry = inflight[inflightHead++]
    if (inflightHead === inflight.length) {
      inflight = []
      inflightHead = 0
    }
    return entry
  }

  const onPubSub = (kind: string | undefined, values: ReadonlyArray<Reply>, reply: Reply) => {
    if (kind !== undefined && subscriptionKinds.has(kind)) {
      const count = values[2]
      if (
        values.length !== 3 || bytesOf(values[1]) === undefined || count?._tag !== "Integer" ||
        count.value < BigInt("0") || count.value > BigInt(Number.MAX_SAFE_INTEGER)
      ) {
        throw new RedisError({ reason: "Protocol", message: "Invalid Redis subscription acknowledgement" })
      }
      // Redis counts global and sharded subscriptions separately.
      if (kind === "ssubscribe" || kind === "sunsubscribe") shardSubscriptions = Number(count.value)
      else subscriptions = Number(count.value)
      const head = nextInflight()
      if (head?.subscription?.kind === kind && sameBytes(head.subscription.channel, bytesOf(values[1]))) {
        settle(takeInflight()!, Result.succeed(reply))
      }
    }
    for (const listener of listeners) listener(reply)
  }

  const receive = (reply: Reply) => {
    const value = unwrap(reply)
    if (value._tag === "Push" || (value._tag === "Array" && protocol === 2)) {
      const bytes = bytesOf(value.values[0])
      const kind = bytes === undefined ? undefined : new TextDecoder().decode(bytes)
      const subscribed = subscriptions + shardSubscriptions > 0
      if (
        value._tag === "Push" ||
        (kind !== undefined &&
          ((subscribed && (subscriptionKinds.has(kind) || messageKinds.has(kind))) ||
            nextInflight()?.subscription?.kind === kind))
      ) {
        return onPubSub(kind, value.values, reply)
      }
    }
    const entry = takeInflight()
    if (entry === undefined) throw new RedisError({ reason: "Protocol", message: "Unexpected Redis reply" })
    if (value._tag === "Error") {
      return settle(entry, Result.fail(new RedisError({ reason: "Server", message: value.message, code: value.code })))
    }
    if (entry.protocol !== undefined) protocol = entry.protocol
    if (entry.reset) subscriptions = shardSubscriptions = 0
    settle(entry, Result.succeed(reply))
  }

  yield* transport.run((bytes) => {
    for (const reply of parser.push(bytes)) receive(reply)
  }).pipe(
    Effect.catchCause((cause) => {
      const error = Cause.squash(cause)
      if (error instanceof RedisError && (error.reason === "Connection" || error.reason === "Closed")) {
        // A reply truncated by EOF is a protocol failure, not a clean disconnect.
        try {
          parser.end()
        } catch (truncated) {
          return failWith(Cause.fail(truncated))
        }
      }
      return failWith(cause)
    }),
    Effect.forkScoped
  )

  const connection: RedisConnection = {
    endpoint,
    execute,
    pipeline: (commands) => run(commands.map((command) => command.arguments)),
    close,
    closed: Deferred.await(terminal),
    isOpen: () => failure === undefined,
    onPush: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }

  yield* Effect.gen(function*() {
    const password = config.password === undefined
      ? undefined
      : Effect.isEffect(config.password)
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

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
  /**
   * Submits one command without an Effect and delivers its result to
   * `onResult`, ignoring `commandTimeout`. The returned function withdraws the
   * command while it is still queued; written commands stay in flight so
   * later replies remain aligned.
   */
  readonly submitUnsafe: (
    args: ReadonlyArray<Argument>,
    onResult: (result: Result.Result<Reply, RedisError>) => void
  ) => () => void
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
  /** RESP-encoded command, as text when every argument is text. */
  readonly payload: string | Uint8Array
  readonly size: number
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
const decoder = new TextDecoder()

const toError = (cause: unknown, message: string): RedisError =>
  cause instanceof RedisError ? cause : new RedisError({ reason: "Protocol", message, cause, outcome: "NotSent" })

// Command names repeat, so their normalised form is cached.
const commandNames = new Map<string, string>()
const commandName = (arg: Argument | undefined): string => {
  if (typeof arg !== "string") return Internal.argumentText(arg).toUpperCase()
  let name = commandNames.get(arg)
  if (name === undefined) {
    if (commandNames.size >= 1024) commandNames.clear()
    name = arg.toUpperCase()
    commandNames.set(arg, name)
  }
  return name
}

const prepare = (
  args: ReadonlyArray<Argument>,
  onResult: Entry["onResult"]
): Entry => {
  const command = commandName(args[0])
  const subcommand = command === "CLIENT" || command === "HELLO" ? Internal.argumentText(args[1]).toUpperCase() : ""
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
  const payload = Protocol.encodeText(args) ?? Protocol.encode(args)
  return {
    payload,
    size: typeof payload === "string" ? Protocol.utf8Length(payload) : payload.length,
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

const concat = (entries: ReadonlyArray<Entry>): string | Uint8Array => {
  if (entries.length === 1) return entries[0].payload
  if (entries.every((entry) => typeof entry.payload === "string")) {
    let text = ""
    for (const entry of entries) text += entry.payload as string
    return text
  }
  const bytes = new Uint8Array(entries.reduce((size, entry) => size + entry.size, 0))
  let offset = 0
  for (const entry of entries) {
    const chunk = typeof entry.payload === "string" ? encoder.encode(entry.payload) : entry.payload
    bytes.set(chunk, offset)
    offset += chunk.length
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
  const terminal = Deferred.makeUnsafe<never, RedisError>()
  const unsettled = new Set<Entry>()
  // Admitted entries awaiting the next write.
  let pending: Array<Entry> = []
  // Entries written to the transport, in reply order.
  const inflight: Array<Entry> = []
  // Resumes the writer fiber once a batch is ready or the connection failed.
  let wake: ((exit: Effect.Effect<void, RedisError>) => void) | undefined
  let flushScheduled = false
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
    if (!entry.sent) queuedBytes -= entry.size
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
    inflight.length = 0
    pending = []
    listeners.clear()
    const resume = wake
    wake = undefined
    resume?.(Effect.fail(error))
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

  // Commands admitted in the same tick are written together in one batch;
  // the writer fiber is woken synchronously from the microtask.
  const flush = () => {
    flushScheduled = false
    const resume = wake
    if (resume === undefined || failure !== undefined) return
    wake = undefined
    resume(Effect.void)
  }

  const admit = (entries: ReadonlyArray<Entry>) => {
    let size = 0
    for (const entry of entries) size += entry.size
    if (unsettled.size + entries.length > maxPending || queuedBytes + size > maxQueuedBytes) {
      throw Internal.notSent("Capacity", "Redis command queue capacity exceeded")
    }
    queuedBytes += size
    for (const entry of entries) {
      unsettled.add(entry)
      pending.push(entry)
    }
    if (!flushScheduled) {
      flushScheduled = true
      Promise.resolve().then(flush)
    }
  }

  const submit = (
    commands: ReadonlyArray<ReadonlyArray<Argument>>,
    onResult: (index: number, result: Result.Result<Reply, RedisError>) => void
  ): ReadonlyArray<Entry> => {
    if (failure !== undefined) throw Internal.notSent("Closed", "Redis connection is unavailable")
    // Validate the whole batch before queueing any part of it.
    const entries = commands.map((args, index) => prepare(args, (result) => onResult(index, result)))
    admit(entries)
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

  const noop = () => {}

  const submitUnsafe: RedisConnection["submitUnsafe"] = (args, onResult) => {
    let entry: Entry
    try {
      if (failure !== undefined) throw Internal.notSent("Closed", "Redis connection is unavailable")
      entry = prepare(args, onResult)
      admit([entry])
    } catch (cause) {
      onResult(Result.fail(toError(cause, "Cannot encode Redis command")))
      return noop
    }
    return () => cancel(entry)
  }

  const execute = (args: ReadonlyArray<Argument>): Effect.Effect<Reply, RedisError> =>
    timeout !== undefined
      ? Effect.flatMap(run([args]), (results) => Effect.fromResult(results[0]))
      : Effect.callback((resume) =>
        Effect.sync(submitUnsafe(args, (result) =>
          resume(result._tag === "Success" ? Effect.succeed(result.success) : Effect.fail(result.failure))))
      )

  const awaitBatch = Effect.callback<void, RedisError>((resume) => {
    if (failure !== undefined) return resume(Effect.fail(failure))
    if (pending.length > 0 && !flushScheduled) return resume(Effect.void)
    wake = resume
  })

  yield* awaitBatch.pipe(
    Effect.flatMap(() => {
      const batch = pending
      pending = []
      const entries = batch.filter((entry) => !entry.done)
      if (entries.length === 0) return Effect.void
      for (const entry of entries) {
        entry.sent = true
        queuedBytes -= entry.size
        inflight.push(entry)
      }
      return transport.write(concat(entries))
    }),
    Effect.forever,
    Effect.catchCause(failWith),
    Effect.forkScoped
  )

  const acknowledge = (kind: string, values: ReadonlyArray<Reply>, reply: Reply) => {
    const count = values[2]
    if (
      values.length !== 3 || Protocol.bytesOf(values[1]) === undefined || count?._tag !== "Integer" ||
      count.value < BigInt("0") || count.value > BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      throw new RedisError({ reason: "Protocol", message: "Invalid Redis subscription acknowledgement" })
    }
    // Redis counts global and sharded subscriptions separately.
    if (kind === "ssubscribe" || kind === "sunsubscribe") shardSubscriptions = Number(count.value)
    else subscriptions = Number(count.value)
    const head = inflight[0]
    if (
      head?.subscription?.kind === kind && Protocol.sameBytes(head.subscription.channel, Protocol.bytesOf(values[1]))
    ) {
      inflight.shift()
      settle(head, Result.succeed(reply))
    }
  }

  const receive = (reply: Reply) => {
    const value = Protocol.unwrap(reply)
    if (value._tag === "Push" || (value._tag === "Array" && protocol === 2)) {
      const bytes = Protocol.bytesOf(value.values[0])
      const kind = bytes === undefined ? undefined : decoder.decode(bytes)
      const subscribed = subscriptions + shardSubscriptions > 0
      const isPush = value._tag === "Push" || (kind !== undefined && (
        (subscribed && (subscriptionKinds.has(kind) || messageKinds.has(kind))) ||
        inflight[0]?.subscription?.kind === kind
      ))
      if (isPush) {
        if (kind !== undefined && subscriptionKinds.has(kind)) acknowledge(kind, value.values, reply)
        for (const listener of listeners) listener(reply)
        return
      }
    }
    const entry = inflight.shift()
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
    submitUnsafe,
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

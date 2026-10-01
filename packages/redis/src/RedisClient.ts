/**
 * General-purpose Redis clients with standalone, Cluster, and Sentinel routing.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Queue from "effect/Queue"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import * as Cluster from "./internal/cluster.ts"
import * as ConnectionInternal from "./internal/connection.ts"
import { prepareSnapshots } from "./internal/encoding.ts"
import * as Sentinel from "./internal/sentinel.ts"
import type * as TopologyInternal from "./internal/topology.ts"
import * as TransactionInternal from "./internal/transaction.ts"
import { endpointKey } from "./internal/transport.ts"
import * as Command from "./RedisCommand.ts"
import * as Connection from "./RedisConnection.ts"
import { RedisError } from "./RedisError.ts"
import type * as Protocol from "./RedisProtocol.ts"

/**
 * Standalone, Redis Cluster, or Sentinel discovery configuration.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export type TopologyConfig =
  | { readonly _tag: "Standalone"; readonly endpoint: Connection.Endpoint }
  | TopologyInternal.ClusterConfig
  | TopologyInternal.SentinelConfig

/**
 * Session settings and topology for a native Redis client.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Config extends Connection.Config {
  readonly topology?: TopologyConfig | undefined
  /** Finite positive delay between subscription reconnect attempts. */
  readonly reconnectDelay?: Duration.Input | undefined
}

/**
 * Key or explicit node to which a dedicated scoped session is pinned.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Affinity {
  readonly key?: Protocol.Argument | undefined
  readonly node?: Connection.Endpoint | undefined
}

/**
 * Native Redis command execution and dedicated session acquisition.
 *
 * **Details**
 *
 * Raw execution preserves wire reply types. Typed descriptors decode replies.
 * Cluster commands use descriptor key positions or explicit routing metadata.
 * Node-local operations require an explicit node for meaningful Cluster scope.
 *
 * **Gotchas**
 *
 * Use a reserved connection for transactions, blocking operations, and
 * connection-local state. Pipelines preserve result positions and submit each
 * node's commands in input order without waiting for individual replies.
 * Cluster redirects retry only rejected commands. During slot migration,
 * successes on one node and retries on another have no global execution order.
 * Pipelines are not cross-node transactions.
 * Interrupted or disconnected commands may already have executed.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface RedisClient {
  readonly config: Config
  /** Completes when the owning client scope closes. */
  readonly closed: Effect.Effect<void>
  readonly execute: (
    args: ReadonlyArray<Protocol.Argument>,
    routing?: Command.Routing
  ) => Effect.Effect<Protocol.Reply, RedisError>
  readonly run: <A>(command: Command.RedisCommand<A>) => Effect.Effect<A, RedisError>
  readonly pipeline: <Commands extends ReadonlyArray<Command.RedisCommand<any>>>(commands: Commands) => Effect.Effect<
    {
      readonly [K in keyof Commands]: Result.Result<
        Commands[K] extends Command.RedisCommand<infer A> ? A : never,
        RedisError
      >
    },
    RedisError
  >
  readonly reserve: (affinity?: Affinity) => Effect.Effect<Connection.RedisConnection, RedisError, Scope.Scope>
  readonly refresh: Effect.Effect<void, RedisError>
  readonly nodes: Effect.Effect<ReadonlyArray<Connection.Endpoint>>
}

/**
 * Service tag for a general-purpose native Redis client.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export const RedisClient = Context.Service<RedisClient>("@effect/redis/RedisClient")

const dedicated = new Set(
  "MULTI EXEC DISCARD WATCH UNWATCH AUTH SELECT HELLO RESET WAIT WAITAOF READONLY READWRITE ASKING MONITOR QUIT SUBSCRIBE PSUBSCRIBE SSUBSCRIBE UNSUBSCRIBE PUNSUBSCRIBE SUNSUBSCRIBE BLPOP BRPOP BRPOPLPUSH BLMOVE BZPOPMIN BZPOPMAX BLMPOP BZMPOP"
    .split(" ")
)
const requiresReservation = (args: ReadonlyArray<Protocol.Argument>) => {
  const command = Command.argumentText(args[0]).toUpperCase()
  return dedicated.has(command) ||
    ((command === "XREAD" || command === "XREADGROUP") && Command.parseStreams(args)?.blocking === true) ||
    (command === "CLIENT" &&
      ["REPLY", "TRACKING", "CACHING", "SETNAME", "SETINFO", "NO-EVICT", "NO-TOUCH"].includes(
        Command.argumentText(args[1]).toUpperCase()
      )) ||
    (command === "SCRIPT" && Command.argumentText(args[1]).toUpperCase() === "DEBUG")
}

const snapshotArguments = (args: ReadonlyArray<Protocol.Argument>): ReadonlyArray<Protocol.Argument> =>
  args.map((argument) => typeof argument === "string" ? argument : new Uint8Array(argument))

const snapshotRouting = (routing: Command.Routing | undefined): Command.Routing | undefined =>
  routing === undefined ? undefined : {
    ...routing,
    keyIndexes: routing.keyIndexes?.slice(),
    node: routing.node === undefined ? undefined : { ...routing.node }
  }

/**
 * Creates a scoped native Redis client using an injected byte connector.
 *
 * **Details**
 *
 * Initialization validates discovery and a server connection. Failed shared
 * sessions are replaced for subsequent commands. In-flight commands are never
 * replayed after transport failure.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(connector: Connection.Connector, options: Config = {}) {
  const scope = yield* Scope.fork(yield* Effect.scope)
  return yield* makeClient(connector, options).pipe(
    Scope.provide(scope),
    Effect.onError(() => Scope.close(scope, Exit.void))
  )
})

const makeClient = Effect.fnUntraced(function*(connector: Connection.Connector, options: Config) {
  if (options.reconnectDelay !== undefined) {
    const input = options.reconnectDelay
    const reconnectDelay = yield* Effect.try({
      try: () => Duration.toMillis(input),
      catch: (cause) =>
        new RedisError({ reason: "Routing", message: "Invalid Redis reconnect delay", cause, outcome: "NotSent" })
    })
    if (!Number.isFinite(reconnectDelay) || reconnectDelay <= 0) {
      return yield* Effect.fail(
        new RedisError({
          reason: "Routing",
          message: "Redis reconnect delay must be finite and positive",
          outcome: "NotSent"
        })
      )
    }
  }
  const config: Config = {
    ...options,
    password: typeof options.password === "string" ? Redacted.make(options.password) : options.password,
    topology: options.topology?._tag === "Sentinel"
      ? {
        ...options.topology,
        password: typeof options.topology.password === "string"
          ? Redacted.make(options.topology.password)
          : options.topology.password
      }
      : options.topology
  }
  const scope = yield* Effect.scope
  const topologyConfig = config.topology ?? { _tag: "Standalone" as const, endpoint: { host: "127.0.0.1", port: 6379 } }
  if (topologyConfig._tag === "Cluster" && (config.database ?? 0) !== 0) {
    return yield* Effect.fail(
      new RedisError({ reason: "Routing", message: "Redis Cluster only supports database zero", outcome: "NotSent" })
    )
  }
  const topology: TopologyInternal.Topology = topologyConfig._tag === "Cluster"
    ? yield* Cluster.make(connector, topologyConfig, config)
    : topologyConfig._tag === "Sentinel"
    ? yield* Sentinel.make(connector, topologyConfig, config)
    : {
      _tag: "Standalone",
      resolveSync: (_args, routing) => Result.succeed({ endpoint: routing?.node ?? topologyConfig.endpoint }),
      resolve: (_args, routing) => Effect.succeed({ endpoint: routing?.node ?? topologyConfig.endpoint }),
      refresh: Effect.void,
      endpoints: () => [topologyConfig.endpoint]
    }
  const connections = new Map<
    string,
    { readonly scope: Scope.Closeable; readonly connection: Connection.RedisConnection }
  >()
  let standaloneAddress: {
    readonly host: string
    readonly port: number
    readonly path: string | undefined
    readonly tls: boolean
    readonly key: string
  } | undefined
  const standaloneConnection = () => {
    if (topologyConfig._tag !== "Standalone") return undefined
    const { host, port, path, tls } = topologyConfig.endpoint
    const secure = Boolean(tls)
    // Reuse only the address string. Read current fields on every invocation so
    // replacing or changing the endpoint still selects the current session.
    if (
      standaloneAddress === undefined || standaloneAddress.host !== host || standaloneAddress.port !== port ||
      standaloneAddress.path !== path || standaloneAddress.tls !== secure
    ) {
      standaloneAddress = { host, port, path, tls: secure, key: endpointKey({ host, port, path, tls: secure }) }
    }
    return connections.get(standaloneAddress.key)?.connection
  }
  const reservations = new Set<{ readonly scope: Scope.Closeable; readonly endpoint: Connection.Endpoint }>()
  const connectionLocks = new Map<string, Semaphore.Semaphore>()
  const closedSignal = yield* Deferred.make<void>()
  let closed = false
  yield* Scope.addFinalizer(
    scope,
    Effect.gen(function*() {
      closed = true
      yield* Deferred.succeed(closedSignal, undefined)
      connections.clear()
      connectionLocks.clear()
      for (const entry of reservations) yield* Scope.close(entry.scope, Exit.void)
      reservations.clear()
    })
  )

  const get = (endpoint: Connection.Endpoint): Effect.Effect<Connection.RedisConnection, RedisError> =>
    Effect.suspend(() => {
      if (closed) {
        return Effect.fail(
          new RedisError({ reason: "Closed", message: "Redis client scope closed", outcome: "NotSent" })
        )
      }
      const key = endpointKey(endpoint)
      const cached = connections.get(key)
      if (cached?.connection.isOpen()) return Effect.succeed(cached.connection)
      let lock = connectionLocks.get(key)
      if (lock === undefined) {
        lock = Semaphore.makeUnsafe(1)
        connectionLocks.set(key, lock)
      }
      return lock.withPermit(Effect.gen(function*() {
        if (closed) {
          return yield* Effect.fail(
            new RedisError({ reason: "Closed", message: "Redis client scope closed", outcome: "NotSent" })
          )
        }
        const previous = connections.get(key)
        if (previous?.connection.isOpen()) return previous.connection
        if (previous !== undefined) {
          connections.delete(key)
          yield* Scope.close(previous.scope, Exit.void)
        }
        const discovered = topologyConfig._tag === "Sentinel" &&
          topology.endpoints().some((node) => endpointKey(node) === key)
        const child = yield* Scope.fork(scope)
        const connection = yield* Connection.make(connector, endpoint, config).pipe(
          Effect.provideService(Scope.Scope, child),
          Effect.onError(() => Scope.close(child, Exit.void))
        )
        if (closed || (discovered && !topology.endpoints().some((node) => endpointKey(node) === key))) {
          yield* Scope.close(child, Exit.void)
          return yield* Effect.fail(
            new RedisError({
              reason: "Closed",
              message: "Redis destination retired during acquisition",
              outcome: "NotSent"
            })
          )
        }
        connections.set(key, { scope: child, connection })
        return connection
      }))
    })

  const retire = Effect.gen(function*() {
    if (topologyConfig._tag !== "Sentinel") return
    const current = new Set(topology.endpoints().map(endpointKey))
    for (const [key, entry] of connections) {
      if (current.has(key)) continue
      connections.delete(key)
      yield* Scope.close(entry.scope, Exit.void)
    }
    for (const entry of reservations) {
      if (!current.has(endpointKey(entry.endpoint))) yield* Scope.close(entry.scope, Exit.void)
    }
  })
  const refresh = Effect.suspend(() =>
    closed
      ? Effect.fail(new RedisError({ reason: "Closed", message: "Redis client scope closed", outcome: "NotSent" }))
      : topology.refresh.pipe(Effect.andThen(retire))
  )
  if (topology._tag === "Sentinel") {
    const changes = yield* Queue.unbounded<void>()
    const remove = topology.onChange(() => {
      Queue.offerUnsafe(changes, undefined)
    })
    yield* Scope.addFinalizer(scope, Effect.sync(remove).pipe(Effect.andThen(Queue.shutdown(changes))))
    yield* Effect.forkScoped(Effect.forever(Queue.take(changes).pipe(Effect.andThen(retire))))
  }

  const execute = (
    inputArgs: ReadonlyArray<Protocol.Argument>,
    inputRouting?: Command.Routing
  ): Effect.Effect<Protocol.Reply, RedisError> =>
    Effect.suspend(() => {
      const args = snapshotArguments(inputArgs)
      if (closed) {
        return Effect.fail(
          new RedisError({ reason: "Closed", message: "Redis client scope closed", outcome: "NotSent" })
        )
      }
      if (requiresReservation(args)) {
        return Effect.fail(
          new RedisError({
            reason: "Routing",
            message: "This command requires a reserved Redis connection",
            outcome: "NotSent"
          })
        )
      }
      if (topologyConfig._tag === "Standalone" && inputRouting?.node === undefined) {
        const cached = standaloneConnection()
        // Standalone has no discovery or redirects to refresh. Submit directly
        // on its live session; acquisition still replaces a failed session on
        // the next invocation without replaying uncertain commands.
        if (cached?.isOpen()) return cached.execute(args)
      }
      const routing = snapshotRouting(inputRouting)
      const attempt = (
        destination: TopologyInternal.Resolved & { readonly asking?: boolean },
        remaining: number
      ): Effect.Effect<Protocol.Reply, RedisError> =>
        Effect.suspend(() => {
          if (closed) {
            return Effect.fail(
              new RedisError({ reason: "Closed", message: "Redis client scope closed", outcome: "NotSent" })
            )
          }
          const send = destination.asking
            ? Effect.scoped(
              reserve({ node: destination.endpoint }).pipe(
                Effect.flatMap((reserved) => reserved.execute(["ASKING"]).pipe(Effect.andThen(reserved.execute(args))))
              )
            )
            : get(destination.endpoint).pipe(Effect.flatMap((connection) => connection.execute(args)))
          return send.pipe(Effect.catch((error) => {
            if (closed) return Effect.fail(error)
            const redirect = topology._tag === "Cluster" ? topology.redirect(error, destination.endpoint) : undefined
            if (redirect !== undefined) {
              if (remaining <= 0) {
                return Effect.fail(
                  new RedisError({
                    reason: "Routing",
                    message: "Redis Cluster redirect limit exceeded",
                    cause: error,
                    code: error.code
                  })
                )
              }
              return attempt(redirect, remaining - 1)
            }
            if (topologyConfig._tag === "Sentinel" && error.code === "READONLY" && remaining > 0) {
              return refresh.pipe(
                Effect.andThen(topology.resolve(args, routing)),
                Effect.flatMap((next) => attempt(next, remaining - 1))
              )
            }
            // Refresh discovery for future commands, without replaying this one.
            if (error.reason === "Connection" || error.reason === "Closed") {
              return Effect.ignoreCause(refresh).pipe(Effect.andThen(Effect.fail(error)))
            }
            return Effect.fail(error)
          }))
        })
      const resolved = topology.resolveSync(args, routing)
      return resolved._tag === "Failure"
        ? Effect.fail(resolved.failure)
        : attempt(resolved.success, topologyConfig._tag === "Cluster" ? topologyConfig.maxRedirects ?? 5 : 1)
    })

  const run = <A>(command: Command.RedisCommand<A>): Effect.Effect<A, RedisError> =>
    Effect.callback((resume) => {
      if (!closed && topologyConfig._tag === "Standalone" && command.routing?.node === undefined) {
        const cached = standaloneConnection()
        const submit = cached?.isOpen() ? ConnectionInternal.get(cached) : undefined
        if (submit !== undefined && !requiresReservation(command.arguments)) {
          try {
            const decode = command.decode
            // Admission encodes arguments synchronously within this callback,
            // before any yield. Decode on completion without routing/raw Effect
            // wrappers; decoder defects belong to the caller, not the reader.
            const cancel = submit(command.arguments, (result) => {
              if (result._tag === "Failure") return resume(Effect.fail(result.failure))
              try {
                resume(Effect.fromResult(decode(result.success)))
              } catch (cause) {
                resume(Effect.die(cause))
              }
            })
            return Effect.sync(cancel)
          } catch (cause) {
            return resume(Effect.fail(
              cause instanceof RedisError ? cause : new RedisError({
                reason: "Protocol",
                message: "Cannot encode Redis command",
                cause,
                outcome: "NotSent"
              })
            ))
          }
        }
      }
      resume(
        execute(command.arguments, command.routing).pipe(
          Effect.flatMap((reply) => Effect.fromResult(command.decode(reply)))
        )
      )
    })
  const reserve = (affinity: Affinity = {}): Effect.Effect<Connection.RedisConnection, RedisError, Scope.Scope> =>
    Effect.gen(function*() {
      if (closed) {
        return yield* Effect.fail(
          new RedisError({ reason: "Closed", message: "Redis client scope closed", outcome: "NotSent" })
        )
      }
      const args: ReadonlyArray<Protocol.Argument> = affinity.key === undefined ? ["PING"] : ["GET", affinity.key]
      const resolved = yield* topology.resolve(args, {
        keyIndexes: affinity.key === undefined ? [] : [1],
        node: affinity.node
      })
      const child = yield* Scope.fork(yield* Effect.scope)
      const entry = { scope: child, endpoint: resolved.endpoint }
      reservations.add(entry)
      yield* Scope.addFinalizer(
        child,
        Effect.sync(() => {
          reservations.delete(entry)
        })
      )
      if (closed) {
        yield* Scope.close(child, Exit.void)
        return yield* Effect.fail(
          new RedisError({ reason: "Closed", message: "Redis client scope closed", outcome: "NotSent" })
        )
      }
      const reserved = yield* Connection.make(connector, resolved.endpoint, config).pipe(
        Effect.provideService(Scope.Scope, child),
        Effect.onError(() => Scope.close(child, Exit.void))
      )
      if (closed || !reserved.isOpen()) {
        yield* Scope.close(child, Exit.void)
        return yield* Effect.fail(
          new RedisError({
            reason: "Closed",
            message: "Redis client scope closed during reservation",
            outcome: "NotSent"
          })
        )
      }
      if (resolved.slot === undefined) return reserved
      return {
        ...reserved,
        pipeline: (commands) =>
          Effect.gen(function*() {
            const snapshot = commands.map((command) => ({
              arguments: snapshotArguments(command.arguments),
              routing: snapshotRouting(command.routing)
            }))
            for (const command of snapshot) {
              const targetResult = topology.resolveSync(
                command.arguments,
                command.routing ?? Command.inferRouting(command.arguments)
              )
              if (targetResult._tag === "Failure") return yield* Effect.fail(targetResult.failure)
              const target = targetResult.success
              if (
                (target.slot !== undefined && target.slot !== resolved.slot) ||
                (command.routing?.node !== undefined && endpointKey(target.endpoint) !== endpointKey(resolved.endpoint))
              ) {
                return yield* Effect.fail(
                  new RedisError({
                    reason: "Routing",
                    message: "Reserved connection cannot change Cluster slot",
                    code: "CROSSSLOT",
                    outcome: "NotSent"
                  })
                )
              }
            }
            return yield* reserved.pipeline(snapshot)
          }),
        execute: (command: ReadonlyArray<Protocol.Argument>, routing?: Command.Routing) =>
          topology.resolve(command, routing ?? Command.inferRouting(command)).pipe(
            Effect.flatMap((target) =>
              (target.slot !== undefined && target.slot !== resolved.slot) ||
                (routing?.node !== undefined && endpointKey(target.endpoint) !== endpointKey(resolved.endpoint))
                ? Effect.fail(
                  new RedisError({
                    reason: "Routing",
                    message: "Reserved connection cannot change Cluster slot",
                    code: "CROSSSLOT",
                    outcome: "NotSent"
                  })
                )
                : reserved.execute(command)
            )
          )
      }
    })
  const client: RedisClient = {
    config,
    closed: Deferred.await(closedSignal),
    execute,
    run,
    reserve,
    refresh,
    nodes: Effect.sync(topology.endpoints),
    pipeline: (inputCommands) =>
      Effect.suspend(() => {
        let standalone = topology._tag === "Standalone"
        let binary = false
        const commands = inputCommands.map((command) => {
          const routing = topology._tag === "Standalone" && command.routing?.node === undefined
            ? undefined
            : snapshotRouting(command.routing)
          if (routing?.node !== undefined) standalone = false
          return {
            arguments: command.arguments.map((argument) => {
              if (typeof argument !== "string") binary = true
              return argument
            }),
            decode: command.decode,
            routing
          }
        })
        if (binary) {
          try {
            prepareSnapshots(commands.map((command) => command.arguments))
          } catch (cause) {
            const error = cause instanceof RedisError
              ? cause
              : new RedisError({
                reason: "Protocol",
                message: "Cannot encode Redis command",
                cause,
                outcome: "NotSent"
              })
            return Effect.succeed(commands.map((command) =>
              Result.fail(
                requiresReservation(command.arguments)
                  ? new RedisError({
                    reason: "Routing",
                    message: "This command requires a reserved Redis connection",
                    outcome: "NotSent"
                  })
                  : error
              )
            ))
          }
        }
        return Effect.gen(function*() {
          const results: Array<Result.Result<unknown, RedisError>> = new Array(commands.length)
          if (standalone) {
            // Standalone commands without explicit destinations all share one
            // connection. Preserve errors in place without allocating routing
            // results, submissions or destination groups for every command.
            let indexes: Array<number> | undefined
            for (let index = 0; index < commands.length; index++) {
              if (requiresReservation(commands[index].arguments)) {
                results[index] = Result.fail(
                  new RedisError({
                    reason: "Routing",
                    message: "This command requires a reserved Redis connection",
                    outcome: "NotSent"
                  })
                )
                indexes ??= Array.from({ length: index }, (_, position) => position)
              } else if (indexes !== undefined) indexes.push(index)
            }
            const batch = indexes === undefined ? commands : indexes.map((index) => commands[index])
            if (batch.length === 0) return results
            const resolved = topology.resolveSync([], undefined)
            const response = resolved._tag === "Failure"
              ? resolved
              : yield* Effect.result(
                get(resolved.success.endpoint).pipe(
                  Effect.flatMap((connection) => connection.pipeline(batch))
                )
              )
            let refreshConnection = false
            for (let position = 0; position < batch.length; position++) {
              const index = indexes === undefined ? position : indexes[position]
              const reply = response._tag === "Success"
                ? response.success[position]
                : Result.fail(response.failure)
              results[index] = reply._tag === "Success" ? commands[index].decode(reply.success) : reply
              if (
                reply._tag === "Failure" &&
                (reply.failure.reason === "Connection" || reply.failure.reason === "Closed")
              ) refreshConnection = true
            }
            if (refreshConnection) yield* Effect.ignoreCause(refresh)
            return results
          }
          interface Submission {
            readonly index: number
            readonly destination: TopologyInternal.Resolved & { readonly asking?: boolean }
            readonly remaining: number
          }
          const pending: Array<Submission> = []
          for (let index = 0; index < commands.length; index++) {
            const command = commands[index]
            if (requiresReservation(command.arguments)) {
              results[index] = Result.fail(
                new RedisError({
                  reason: "Routing",
                  message: "This command requires a reserved Redis connection",
                  outcome: "NotSent"
                })
              )
              continue
            }
            const resolved = topology.resolveSync(command.arguments, command.routing)
            if (resolved._tag === "Failure") results[index] = resolved
            else {pending.push({
                index,
                destination: resolved.success,
                remaining: topologyConfig._tag === "Cluster" ? topologyConfig.maxRedirects ?? 5 : 1
              })}
          }
          const groupSubmissions = (submissions: Array<Submission>) => {
            const groups = new Map<string, Array<Submission>>()
            for (const submission of submissions) {
              const key = endpointKey(submission.destination.endpoint) +
                (submission.destination.asking ? ":asking" : "")
              const group = groups.get(key)
              if (group === undefined) groups.set(key, [submission])
              else group.push(submission)
            }
            return groups.values()
          }
          const processGroups = (submissions: Array<Submission>): Effect.Effect<void> => {
            if (submissions.length === 0) return Effect.void
            const groups = Array.from(groupSubmissions(submissions))
            return groups.length === 1
              ? process(groups[0])
              : Effect.forEach(groups, process, { concurrency: "unbounded", discard: true })
          }
          const process: (submissions: Array<Submission>) => Effect.Effect<void> = Effect.fnUntraced(
            function*(submissions) {
              const retries: Array<Submission> = []
              const readonlyRetries: Array<Submission> = []
              const destination = submissions[0].destination
              const batch = submissions.map(({ index }) => commands[index])
              const response = yield* Effect.result(
                destination.asking
                  ? Effect.scoped(
                    reserve({ node: destination.endpoint }).pipe(
                      Effect.flatMap((connection) =>
                        connection.pipeline(batch.flatMap((command) => [{ arguments: ["ASKING"] }, command])).pipe(
                          // ASKING applies to exactly the following command on this exclusive session.
                          Effect.map((replies) => batch.map((_, index) => replies[index * 2 + 1]))
                        )
                      )
                    )
                  )
                  : get(destination.endpoint).pipe(Effect.flatMap((connection) => connection.pipeline(batch)))
              )
              const replies = response._tag === "Success"
                ? response.success
                : submissions.map(() => Result.fail(response.failure))
              for (let position = 0; position < submissions.length; position++) {
                const submission = submissions[position]
                const reply = replies[position]
                if (reply._tag === "Success") {
                  results[submission.index] = commands[submission.index].decode(reply.success)
                  continue
                }
                const error = reply.failure
                const redirect = !closed && topology._tag === "Cluster"
                  ? topology.redirect(error, destination.endpoint)
                  : undefined
                if (redirect !== undefined && submission.remaining > 0) {
                  retries.push({ ...submission, destination: redirect, remaining: submission.remaining - 1 })
                } else if (redirect !== undefined) {
                  results[submission.index] = Result.fail(
                    new RedisError({
                      reason: "Routing",
                      message: "Redis Cluster redirect limit exceeded",
                      cause: error,
                      code: error.code
                    })
                  )
                } else if (
                  !closed && topologyConfig._tag === "Sentinel" && error.reason === "Server" &&
                  error.code === "READONLY" && submission.remaining > 0
                ) {
                  readonlyRetries.push(submission)
                } else results[submission.index] = reply
              }
              if (readonlyRetries.length > 0) {
                const refreshed = yield* Effect.result(refresh)
                for (const submission of readonlyRetries) {
                  if (refreshed._tag === "Failure") {
                    results[submission.index] = refreshed
                    continue
                  }
                  const command = commands[submission.index]
                  const resolved = topology.resolveSync(command.arguments, command.routing)
                  if (resolved._tag === "Failure") results[submission.index] = resolved
                  else {retries.push({
                      ...submission,
                      destination: resolved.success,
                      remaining: submission.remaining - 1
                    })}
                }
              } else if (
                replies.some((reply) =>
                  reply._tag === "Failure" &&
                  (reply.failure.reason === "Connection" || reply.failure.reason === "Closed")
                )
              ) {
                yield* Effect.ignoreCause(refresh)
              }
              if (retries.length > 0) yield* processGroups(retries)
            }
          )
          if (pending.length > 0) yield* processGroups(pending)
          return results
        })
      }) as any
  }
  interface TransactionSession {
    readonly scope: Scope.Closeable
    readonly endpoint: Connection.Endpoint
    readonly connection: Connection.RedisConnection
  }
  const transactionIdle = new Map<string, Array<TransactionSession>>()
  TransactionInternal.register(client, (commands, affinity) => {
    // Connection-local operations and WATCH callbacks must never lend their
    // altered state to another transaction. Ordinary batches can lease a clean
    // transaction-only session, including when command deadlines are enabled.
    if (commands.some((command) => requiresReservation(command.arguments))) {
      return undefined
    }
    return Effect.suspend(() => {
      if (closed) {
        return Effect.fail(
          new RedisError({ reason: "Closed", message: "Redis client scope closed", outcome: "NotSent" })
        )
      }
      const resolved = topology.resolveSync(
        affinity?.key === undefined ? ["PING"] : ["GET", affinity.key],
        { keyIndexes: affinity?.key === undefined ? [] : [1], node: affinity?.node }
      )
      if (resolved._tag === "Failure") return Effect.fail(resolved.failure)
      let endpoint = resolved.success.endpoint
      let slot = resolved.success.slot
      if (topology._tag === "Cluster") {
        let requiredNode: string | undefined
        for (const command of commands) {
          const target = topology.resolveSync(
            command.arguments,
            command.routing ?? Command.inferRouting(command.arguments)
          )
          if (target._tag === "Failure") return Effect.fail(target.failure)
          if (slot === undefined && target.success.slot !== undefined) {
            slot = target.success.slot
            if (affinity?.node === undefined) endpoint = target.success.endpoint
          }
          const node = command.routing?.node === undefined ? undefined : endpointKey(target.success.endpoint)
          if (
            (target.success.slot !== undefined && target.success.slot !== slot) ||
            (node !== undefined && requiredNode !== undefined && requiredNode !== node)
          ) {
            return Effect.fail(
              new RedisError({
                reason: "Routing",
                message: "Transaction commands must use one Cluster slot and destination",
                code: "CROSSSLOT",
                outcome: "NotSent"
              })
            )
          }
          if (node !== undefined) requiredNode = node
        }
        if (requiredNode !== undefined && requiredNode !== endpointKey(endpoint)) {
          return Effect.fail(
            new RedisError({
              reason: "Routing",
              message: "Transaction commands must use one Cluster slot and destination",
              code: "CROSSSLOT",
              outcome: "NotSent"
            })
          )
        }
      }
      const key = endpointKey(endpoint)
      // Exclusive leases isolate even an unrecognized EXEC that leaves Redis
      // in MULTI. Concurrent transactions acquire separate sessions rather
      // than waiting for an in-use connection or sharing ordinary commands.
      return Effect.uninterruptibleMask((restore) =>
        Effect.gen(function*() {
          if (closed) {
            return yield* Effect.fail(
              new RedisError({ reason: "Closed", message: "Redis client scope closed", outcome: "NotSent" })
            )
          }
          let idle = transactionIdle.get(key)
          let session = idle?.pop()
          while (session !== undefined && !session.connection.isOpen()) {
            yield* Scope.close(session.scope, Exit.void)
            session = idle?.pop()
          }
          if (session === undefined) {
            const child = yield* Scope.fork(scope)
            const reservation = { scope: child, endpoint }
            reservations.add(reservation)
            let acquired: TransactionSession | undefined
            yield* Scope.addFinalizer(
              child,
              Effect.sync(() => {
                reservations.delete(reservation)
                if (acquired === undefined) return
                const idle = transactionIdle.get(key)
                const index = idle?.indexOf(acquired) ?? -1
                if (idle !== undefined && index !== -1) idle.splice(index, 1)
                if (idle?.length === 0) transactionIdle.delete(key)
              })
            )
            const connection = yield* restore(
              Connection.make(connector, endpoint, config).pipe(
                Effect.provideService(Scope.Scope, child),
                Effect.onError(() => Scope.close(child, Exit.void))
              )
            )
            if (
              closed || !connection.isOpen() ||
              (topology._tag === "Sentinel" && !topology.endpoints().some((node) => endpointKey(node) === key))
            ) {
              yield* Scope.close(child, Exit.void)
              return yield* Effect.fail(
                new RedisError({
                  reason: "Closed",
                  message: "Redis transaction destination retired during acquisition",
                  outcome: "NotSent"
                })
              )
            }
            session = acquired = { scope: child, endpoint, connection }
          }
          const leased = session
          return yield* restore(leased.connection.pipeline([
            { arguments: ["MULTI"], routing: { keyIndexes: [] } },
            ...commands,
            { arguments: ["EXEC"], routing: { keyIndexes: [] } }
          ])).pipe(
            Effect.flatMap((replies) => Effect.fromResult(TransactionInternal.validate(replies, commands.length))),
            Effect.onExit((exit) =>
              Effect.suspend(() => {
                if (
                  exit._tag === "Failure" ||
                  closed || !leased.connection.isOpen() ||
                  (topology._tag === "Sentinel" && !topology.endpoints().some((node) => endpointKey(node) === key))
                ) {
                  return Scope.close(leased.scope, Exit.void)
                }
                idle = transactionIdle.get(key)
                // Bound idle retention, while leaving active transaction concurrency
                // to the caller instead of serializing it behind a connection limit.
                if (idle !== undefined && idle.length >= 16) return Scope.close(leased.scope, Exit.void)
                if (idle === undefined) transactionIdle.set(key, [leased])
                else idle.push(leased)
                return Effect.void
              })
            )
          )
        })
      )
    })
  })
  const initial = yield* topology.resolve(["PING"], { keyIndexes: [] })
  yield* get(initial.endpoint).pipe(
    Effect.flatMap((connection) =>
      connection.execute(["PING"]).pipe(
        Effect.timeoutOrElse({
          duration: config.commandTimeout ?? "10 seconds",
          orElse: () =>
            Effect.fail(
              new RedisError({ reason: "Timeout", message: "Redis initial PING timed out", outcome: "Unknown" })
            )
        })
      )
    )
  )
  yield* Scope.addFinalizer(
    scope,
    Effect.sync(() => {
      closed = true
    }).pipe(Effect.andThen(Deferred.succeed(closedSignal, undefined)))
  )
  return client
})

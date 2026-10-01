/**
 * General-purpose Redis clients with standalone, Cluster, and Sentinel routing.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Queue from "effect/Queue"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Scope from "effect/Scope"
import * as Cluster from "./internal/cluster.ts"
import * as Sentinel from "./internal/sentinel.ts"
import type * as Topology from "./internal/topology.ts"
import { argumentText, durationMillis, endpointKey, notSent } from "./internal/transport.ts"
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
  | Topology.ClusterConfig
  | Topology.SentinelConfig

/**
 * Session settings and topology for a native Redis client.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Config extends Connection.Config {
  readonly topology?: TopologyConfig | undefined
  /** Delay between subscription reconnect attempts. Defaults to 100 milliseconds. */
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
 * `execute` returns raw replies and `run` decodes them with a typed command.
 * In Cluster, commands are routed by their key slot, using the command's
 * routing metadata or the key positions of well-known commands.
 *
 * **Gotchas**
 *
 * Use `reserve` for transactions, blocking commands, and connection-local
 * state; the shared connections reject them. Commands that may have been
 * written before a failure are never replayed, so their outcome is unknown.
 * Pipelines retry only the commands that Cluster redirected. They are not
 * transactions, and spanning nodes gives no global ordering.
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

// Commands that change connection state, block, or need their own reply mode.
const reservedCommands = new Set(
  ("MULTI EXEC DISCARD WATCH UNWATCH AUTH SELECT HELLO RESET WAIT WAITAOF READONLY READWRITE ASKING MONITOR QUIT " +
    "SUBSCRIBE PSUBSCRIBE SSUBSCRIBE UNSUBSCRIBE PUNSUBSCRIBE SUNSUBSCRIBE " +
    "BLPOP BRPOP BRPOPLPUSH BLMOVE BZPOPMIN BZPOPMAX BLMPOP BZMPOP").split(" ")
)
const reservedClientCommands = new Set(["REPLY", "TRACKING", "CACHING", "SETNAME", "SETINFO", "NO-EVICT", "NO-TOUCH"])

const requiresReservation = (args: ReadonlyArray<Protocol.Argument>): boolean => {
  const command = argumentText(args[0]).toUpperCase()
  if (reservedCommands.has(command)) return true
  switch (command) {
    case "XREAD":
    case "XREADGROUP":
      return Command.parseStreams(args)?.blocking === true
    case "CLIENT":
      return reservedClientCommands.has(argumentText(args[1]).toUpperCase())
    case "SCRIPT":
      return argumentText(args[1]).toUpperCase() === "DEBUG"
    default:
      return false
  }
}

const reservationRequired = () => notSent("Routing", "This command requires a reserved Redis connection")
const clientClosed = () => notSent("Closed", "Redis client scope closed")
const crossSlot = () =>
  new RedisError({
    reason: "Routing",
    message: "Reserved connection cannot change Cluster slot",
    code: "CROSSSLOT",
    outcome: "NotSent"
  })

const isDisconnect = (error: RedisError) => error.reason === "Connection" || error.reason === "Closed"

const redact = <A>(password: string | A): Redacted.Redacted<string> | A =>
  typeof password === "string" ? Redacted.make(password) : password

/**
 * Creates a scoped native Redis client using an injected byte connector.
 *
 * **Details**
 *
 * Discovers the topology and validates a server connection before returning.
 * Failed shared connections are replaced for subsequent commands.
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

interface Destination extends Topology.Resolved {
  readonly asking?: boolean | undefined
}

const makeClient = Effect.fnUntraced(function*(connector: Connection.Connector, options: Config) {
  const scope = yield* Effect.scope
  if (options.reconnectDelay !== undefined) {
    const delay = durationMillis(options.reconnectDelay)
    if (delay === undefined || !Number.isFinite(delay) || delay <= 0) {
      return yield* Effect.fail(notSent("Routing", "Redis reconnect delay must be finite and positive"))
    }
  }
  const config: Config = {
    ...options,
    password: redact(options.password),
    topology: options.topology?._tag === "Sentinel"
      ? { ...options.topology, password: redact(options.topology.password) }
      : options.topology
  }
  const topologyConfig = config.topology ?? { _tag: "Standalone", endpoint: { host: "127.0.0.1", port: 6379 } }
  const topology: Topology.Topology = topologyConfig._tag === "Cluster"
    ? yield* Cluster.make(connector, topologyConfig, config)
    : topologyConfig._tag === "Sentinel"
    ? yield* Sentinel.make(connector, topologyConfig, config)
    : standalone(topologyConfig.endpoint)
  const maxRedirects = topologyConfig._tag === "Cluster" ? topologyConfig.maxRedirects ?? 5 : 1

  let closed = false
  const closedSignal = Deferred.makeUnsafe<void>()

  // Shared connections, one per endpoint. Concurrent callers share an
  // acquisition in progress, and a failed connection is replaced on next use.
  interface Shared {
    readonly scope: Scope.Closeable
    readonly connection: Deferred.Deferred<Connection.RedisConnection, RedisError>
  }
  const shared = new Map<string, Shared>()

  const dropShared = (key: string, entry: Shared) =>
    Effect.suspend(() => {
      if (shared.get(key) === entry) shared.delete(key)
      return Scope.close(entry.scope, Exit.void)
    })

  const connect = (endpoint: Connection.Endpoint): Effect.Effect<Connection.RedisConnection, RedisError> =>
    Effect.suspend(() => {
      if (closed) return Effect.fail(clientClosed())
      const key = endpointKey(endpoint)
      const existing = shared.get(key)
      if (existing !== undefined) {
        return Deferred.await(existing.connection).pipe(
          Effect.flatMap((connection) =>
            connection.isOpen()
              ? Effect.succeed(connection)
              : Effect.andThen(dropShared(key, existing), connect(endpoint))
          )
        )
      }
      const entry: Shared = { scope: Scope.forkUnsafe(scope), connection: Deferred.makeUnsafe() }
      shared.set(key, entry)
      return Connection.make(connector, endpoint, config).pipe(
        Scope.provide(entry.scope),
        Effect.tapError(() => dropShared(key, entry)),
        Deferred.into(entry.connection),
        Effect.forkIn(scope),
        Effect.andThen(Deferred.await(entry.connection))
      )
    })

  // Dedicated sessions also close with the client.
  const reservations = new Set<{ readonly scope: Scope.Closeable; readonly endpoint: Connection.Endpoint }>()

  yield* Scope.addFinalizer(
    scope,
    Effect.gen(function*() {
      closed = true
      Deferred.doneUnsafe(closedSignal, Effect.void)
      for (const reservation of reservations) yield* Scope.close(reservation.scope, Exit.void)
    })
  )

  // Sentinel failover: close every session to a node that is no longer primary.
  const retire = Effect.suspend(() => {
    const current = new Set(topology.endpoints().map(endpointKey))
    const stale = [
      ...Array.from(shared, ([key, entry]) => current.has(key) ? undefined : dropShared(key, entry)),
      ...Array.from(
        reservations,
        (entry) => current.has(endpointKey(entry.endpoint)) ? undefined : Scope.close(entry.scope, Exit.void)
      )
    ].filter((effect) => effect !== undefined)
    return Effect.all(stale, { discard: true })
  })
  if (topology._tag === "Sentinel") {
    const changes = yield* Queue.unbounded<void>()
    const remove = topology.onChange(() => Queue.offerUnsafe(changes, undefined))
    yield* Scope.addFinalizer(scope, Effect.sync(remove))
    yield* Queue.take(changes).pipe(Effect.andThen(retire), Effect.forever, Effect.forkScoped)
  }

  const refresh: Effect.Effect<void, RedisError> = Effect.suspend(() =>
    closed ? Effect.fail(clientClosed()) : Effect.andThen(topology.refresh, retire)
  )

  const reserve = (affinity: Affinity = {}): Effect.Effect<Connection.RedisConnection, RedisError, Scope.Scope> =>
    Effect.gen(function*() {
      if (closed) return yield* Effect.fail(clientClosed())
      const target = yield* topology.resolve(
        affinity.key === undefined ? ["PING"] : ["GET", affinity.key],
        { keyIndexes: affinity.key === undefined ? [] : [1], node: affinity.node }
      )
      const child = yield* Scope.fork(yield* Effect.scope)
      const reservation = { scope: child, endpoint: target.endpoint }
      reservations.add(reservation)
      yield* Scope.addFinalizer(child, Effect.sync(() => reservations.delete(reservation)))
      const connection = yield* Connection.make(connector, target.endpoint, config).pipe(
        Scope.provide(child),
        Effect.onError(() => Scope.close(child, Exit.void))
      )
      if (closed) {
        yield* Scope.close(child, Exit.void)
        return yield* Effect.fail(clientClosed())
      }
      return target.slot === undefined ? connection : pinToSlot(connection, target.slot)
    })

  // A key-affine Cluster session only accepts commands for its own slot.
  const pinToSlot = (connection: Connection.RedisConnection, slot: number): Connection.RedisConnection => {
    const check = (args: ReadonlyArray<Protocol.Argument>, routing: Command.Routing | undefined) => {
      const target = topology.route(args, routing ?? Command.inferRouting(args))
      if (target._tag === "Failure") return target.failure
      const sameNode = routing?.node === undefined ||
        endpointKey(target.success.endpoint) === endpointKey(connection.endpoint)
      return (target.success.slot === undefined || target.success.slot === slot) && sameNode ? undefined : crossSlot()
    }
    return {
      ...connection,
      execute: (args, routing) =>
        Effect.suspend(() => {
          const error = check(args, routing)
          return error === undefined ? connection.execute(args) : Effect.fail(error)
        }),
      pipeline: (commands) =>
        Effect.suspend(() => {
          for (const command of commands) {
            const error = check(command.arguments, command.routing)
            if (error !== undefined) return Effect.fail(error)
          }
          return connection.pipeline(commands)
        })
    }
  }

  const send = (
    args: ReadonlyArray<Protocol.Argument>,
    routing: Command.Routing | undefined,
    destination: Destination,
    remaining: number
  ): Effect.Effect<Protocol.Reply, RedisError> => {
    // ASKING applies only to the next command on the same connection.
    const attempt = destination.asking
      ? Effect.scoped(
        reserve({ node: destination.endpoint }).pipe(
          Effect.flatMap((connection) => Effect.andThen(connection.execute(["ASKING"]), connection.execute(args)))
        )
      )
      : Effect.flatMap(connect(destination.endpoint), (connection) => connection.execute(args))
    return Effect.catch(attempt, (error): Effect.Effect<Protocol.Reply, RedisError> => {
      if (closed) return Effect.fail(error)
      const redirect = topology.redirect(error, destination.endpoint)
      if (redirect !== undefined) {
        return remaining > 0
          ? send(args, routing, redirect, remaining - 1)
          : Effect.fail(redirectLimit(error))
      }
      // A demoted Sentinel primary rejects the write without executing it.
      if (topology._tag === "Sentinel" && error.code === "READONLY" && remaining > 0) {
        return refresh.pipe(
          Effect.andThen(topology.resolve(args, routing)),
          Effect.flatMap((next) => send(args, routing, next, remaining - 1))
        )
      }
      // Rediscover for later commands, but never replay this one.
      if (isDisconnect(error)) return Effect.andThen(Effect.ignore(refresh), Effect.fail(error))
      return Effect.fail(error)
    })
  }

  const execute: RedisClient["execute"] = (args, routing) =>
    Effect.suspend(() => {
      if (closed) return Effect.fail(clientClosed())
      if (requiresReservation(args)) return Effect.fail(reservationRequired())
      const target = topology.route(args, routing)
      return target._tag === "Failure" ? Effect.fail(target.failure) : send(args, routing, target.success, maxRedirects)
    })

  const pipeline = (
    commands: ReadonlyArray<Command.RedisCommand<unknown>>
  ): Effect.Effect<Array<Result.Result<unknown, RedisError>>, RedisError> =>
    Effect.gen(function*() {
      const results = new Array<Result.Result<unknown, RedisError>>(commands.length)
      interface Pending {
        readonly index: number
        readonly destination: Destination
        readonly remaining: number
      }
      const route = (index: number, remaining: number): Pending | undefined => {
        const command = commands[index]
        const target = topology.route(command.arguments, command.routing)
        if (target._tag === "Success") return { index, destination: target.success, remaining }
        results[index] = target
      }

      const submit = (group: ReadonlyArray<Pending>) => {
        const { asking, endpoint } = group[0].destination
        const batch = group.map(({ index }) => ({ arguments: commands[index].arguments }))
        return asking
          ? Effect.scoped(
            reserve({ node: endpoint }).pipe(
              Effect.flatMap((connection) =>
                connection.pipeline(batch.flatMap((command) => [{ arguments: ["ASKING"] }, command]))
              ),
              Effect.map((replies) => replies.filter((_, index) => index % 2 === 1))
            )
          )
          : Effect.flatMap(connect(endpoint), (connection) => connection.pipeline(batch))
      }

      const process = (group: ReadonlyArray<Pending>): Effect.Effect<void> =>
        Effect.gen(function*() {
          const response = yield* Effect.result(submit(group))
          const retries: Array<Pending> = []
          const readOnly: Array<Pending> = []
          let disconnected = false
          group.forEach((pending, position) => {
            const reply = response._tag === "Success" ? response.success[position] : response
            if (reply._tag === "Success") {
              results[pending.index] = commands[pending.index].decode(reply.success)
              return
            }
            const error = reply.failure
            const redirect = closed ? undefined : topology.redirect(error, pending.destination.endpoint)
            if (redirect !== undefined && pending.remaining > 0) {
              retries.push({ ...pending, destination: redirect, remaining: pending.remaining - 1 })
            } else if (redirect !== undefined) {
              results[pending.index] = Result.fail(redirectLimit(error))
            } else if (topology._tag === "Sentinel" && error.code === "READONLY" && pending.remaining > 0) {
              readOnly.push(pending)
            } else {
              disconnected ||= isDisconnect(error)
              results[pending.index] = reply
            }
          })
          if (readOnly.length > 0) {
            const refreshed = yield* Effect.result(refresh)
            for (const pending of readOnly) {
              if (refreshed._tag === "Failure") results[pending.index] = refreshed
              else {
                const next = route(pending.index, pending.remaining - 1)
                if (next !== undefined) retries.push(next)
              }
            }
          } else if (disconnected) {
            yield* Effect.ignore(refresh)
          }
          yield* processAll(retries)
        })

      // Commands for the same destination share one batch; destinations run concurrently.
      const processAll = (pending: ReadonlyArray<Pending>): Effect.Effect<void> => {
        const groups = new Map<string, Array<Pending>>()
        for (const entry of pending) {
          const key = `${endpointKey(entry.destination.endpoint)}${entry.destination.asking ? "#asking" : ""}`
          const group = groups.get(key)
          if (group === undefined) groups.set(key, [entry])
          else group.push(entry)
        }
        return Effect.forEach(groups.values(), process, { concurrency: "unbounded", discard: true })
      }

      if (closed) return yield* Effect.fail(clientClosed())
      const pending: Array<Pending> = []
      commands.forEach((command, index) => {
        if (requiresReservation(command.arguments)) {
          results[index] = Result.fail(reservationRequired())
          return
        }
        const next = route(index, maxRedirects)
        if (next !== undefined) pending.push(next)
      })
      yield* processAll(pending)
      return results
    })

  const client: RedisClient = {
    config,
    closed: Deferred.await(closedSignal),
    execute,
    run: (command) =>
      Effect.flatMap(execute(command.arguments, command.routing), (reply) => Effect.fromResult(command.decode(reply))),
    pipeline: pipeline as RedisClient["pipeline"],
    reserve,
    refresh,
    nodes: Effect.sync(topology.endpoints)
  }

  const initial = yield* topology.resolve(["PING"], { keyIndexes: [] })
  yield* connect(initial.endpoint).pipe(
    Effect.flatMap((connection) => connection.execute(["PING"])),
    Effect.timeoutOrElse({
      duration: config.commandTimeout ?? "10 seconds",
      orElse: () =>
        Effect.fail(new RedisError({ reason: "Timeout", message: "Redis initial PING timed out", outcome: "Unknown" }))
    })
  )
  return client
})

const redirectLimit = (error: RedisError) =>
  new RedisError({
    reason: "Routing",
    message: "Redis Cluster redirect limit exceeded",
    cause: error,
    code: error.code
  })

const standalone = (endpoint: Connection.Endpoint): Topology.Topology => ({
  _tag: "Standalone",
  route: (_args, routing) => Result.succeed({ endpoint: routing?.node ?? endpoint }),
  resolve: (_args, routing) => Effect.succeed({ endpoint: routing?.node ?? endpoint }),
  refresh: Effect.void,
  endpoints: () => [endpoint],
  redirect: () => undefined,
  onChange: () => () => {}
})

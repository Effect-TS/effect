/**
 * General-purpose Redis clients with standalone, Cluster, and Sentinel routing.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Configuration from "../Config.ts"
import * as Context from "../Context.ts"
import * as Deferred from "../Deferred.ts"
import type * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Exit from "../Exit.ts"
import * as Layer from "../Layer.ts"
import * as Queue from "../Queue.ts"
import * as Redacted from "../Redacted.ts"
import * as Result from "../Result.ts"
import * as Scope from "../Scope.ts"
import * as SocketConnector from "../socket/SocketConnector.ts"
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
export const RedisClient = Context.Service<RedisClient>("effect/redis/RedisClient")

const reservedCommands = new Set(
  ("MULTI EXEC DISCARD WATCH UNWATCH AUTH SELECT HELLO RESET WAIT WAITAOF READONLY READWRITE ASKING MONITOR QUIT " +
    "SUBSCRIBE PSUBSCRIBE SSUBSCRIBE UNSUBSCRIBE PUNSUBSCRIBE SUNSUBSCRIBE " +
    "BLPOP BRPOP BRPOPLPUSH BLMOVE BZPOPMIN BZPOPMAX BLMPOP BZMPOP").split(" ")
)
const reservedClientCommands = new Set(["REPLY", "TRACKING", "CACHING", "SETNAME", "SETINFO", "NO-EVICT", "NO-TOUCH"])

// Command names repeat, so the outcome is cached unless it depends on the arguments.
const reservationCache = new Map<string, boolean>()
const requiresReservation = (args: ReadonlyArray<Protocol.Argument>): boolean => {
  const first = args[0]
  const cached = typeof first === "string" ? reservationCache.get(first) : undefined
  if (cached !== undefined) return cached
  const command = argumentText(first).toUpperCase()
  let result: boolean
  if (reservedCommands.has(command)) result = true
  else {
    switch (command) {
      case "XREAD":
      case "XREADGROUP":
        return Command.parseStreams(args)?.blocking === true
      case "CLIENT":
        return reservedClientCommands.has(argumentText(args[1]).toUpperCase())
      case "SCRIPT":
        return argumentText(args[1]).toUpperCase() === "DEBUG"
      default:
        result = false
    }
  }
  if (typeof first === "string") {
    if (reservationCache.size >= 1024) reservationCache.clear()
    reservationCache.set(first, result)
  }
  return result
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

  // Concurrent callers share the in-progress acquisition for each endpoint.
  interface Shared {
    readonly scope: Scope.Closeable
    readonly connection: Deferred.Deferred<Connection.RedisConnection, RedisError>
    /** Set once acquired, so commands can skip awaiting the deferred. */
    current?: Connection.RedisConnection
  }
  const shared = new Map<string, Shared>()
  // Topologies return stable endpoint objects, so the last lookup is cached
  // until the map changes.
  let lastEndpoint: Connection.Endpoint | undefined
  let lastShared: Shared | undefined
  const sharedFor = (endpoint: Connection.Endpoint): Shared | undefined => {
    if (endpoint !== lastEndpoint) {
      lastEndpoint = endpoint
      lastShared = shared.get(endpointKey(endpoint))
    }
    return lastShared
  }

  const dropShared = (key: string, entry: Shared) =>
    Effect.suspend(() => {
      if (shared.get(key) === entry) {
        shared.delete(key)
        lastEndpoint = undefined
      }
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
      lastEndpoint = undefined
      return Connection.make(connector, endpoint, config).pipe(
        Scope.provide(entry.scope),
        Effect.map((connection) => entry.current = connection),
        Effect.onError(() => dropShared(key, entry)),
        Deferred.into(entry.connection),
        Effect.forkIn(scope),
        Effect.andThen(Deferred.await(entry.connection))
      )
    })

  const reservations = new Set<{ readonly scope: Scope.Closeable; readonly endpoint: Connection.Endpoint }>()

  yield* Scope.addFinalizer(
    scope,
    Effect.gen(function*() {
      closed = true
      Deferred.doneUnsafe(closedSignal, Effect.void)
      for (const reservation of reservations) yield* Scope.close(reservation.scope, Exit.void)
    })
  )

  // Closes connections to nodes that left the topology.
  const retire = Effect.suspend(() => {
    const current = new Set(topology.endpoints().map(endpointKey))
    const stale: Array<Effect.Effect<void>> = []
    for (const [key, entry] of shared) {
      if (!current.has(key)) stale.push(dropShared(key, entry))
    }
    for (const reservation of reservations) {
      if (!current.has(endpointKey(reservation.endpoint))) stale.push(Scope.close(reservation.scope, Exit.void))
    }
    return Effect.all(stale, { discard: true })
  })
  if (topology._tag === "Sentinel") {
    const changes = yield* Queue.unbounded<void>()
    yield* Scope.addFinalizer(scope, Effect.sync(topology.onChange(() => Queue.offerUnsafe(changes, undefined))))
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
      submitUnsafe: (args, onResult) => {
        const error = check(args, undefined)
        if (error === undefined) return connection.submitUnsafe(args, onResult)
        onResult(Result.fail(error))
        return () => {}
      },
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

  interface Pending {
    readonly index: number
    readonly target: Topology.Resolved
    readonly remaining: number
  }

  const pipeline = (
    commands: ReadonlyArray<Command.RedisCommand<unknown>>
  ): Effect.Effect<Array<Result.Result<unknown, RedisError>>, RedisError> =>
    Effect.suspend(() => {
      if (closed) return Effect.fail(clientClosed())
      const results = new Array<Result.Result<unknown, RedisError>>(commands.length)

      const route = (index: number, remaining: number): Pending | undefined => {
        const target = topology.route(commands[index].arguments, commands[index].routing)
        if (target._tag === "Success") return { index, target: target.success, remaining }
        results[index] = target
      }

      const submit = (group: ReadonlyArray<Pending>) => {
        const { asking, endpoint } = group[0].target
        const batch = group.map(({ index }) => ({ arguments: commands[index].arguments }))
        if (!asking) return Effect.flatMap(connect(endpoint), (connection) => connection.pipeline(batch))
        // ASKING applies only to the next command on the same connection.
        return Effect.scoped(
          Effect.flatMap(reserve({ node: endpoint }), (connection) =>
            Effect.forEach(batch, (command) =>
              Effect.result(Effect.andThen(connection.execute(["ASKING"]), connection.execute(command.arguments)))))
        )
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
            const redirect = closed ? undefined : topology.redirect(error, pending.target.endpoint)
            if (redirect !== undefined) {
              if (pending.remaining > 0) {
                retries.push({ index: pending.index, target: redirect, remaining: pending.remaining - 1 })
              } else {
                results[pending.index] = Result.fail(Cluster.redirectLimit(error))
              }
            } else if (topology._tag === "Sentinel" && error.code === "READONLY" && pending.remaining > 0) {
              // A demoted Sentinel primary rejects the write without executing it.
              readOnly.push(pending)
            } else {
              disconnected ||= isDisconnect(error)
              results[pending.index] = reply
            }
          })
          if (readOnly.length > 0) {
            const refreshed = yield* Effect.result(refresh)
            for (const pending of readOnly) {
              if (refreshed._tag === "Failure") {
                results[pending.index] = refreshed
              } else {
                const next = route(pending.index, pending.remaining - 1)
                if (next !== undefined) {
                  retries.push(next)
                }
              }
            }
          } else if (disconnected) {
            // Rediscover for later commands, but never replay these.
            yield* Effect.ignore(refresh)
          }
          yield* dispatch(retries)
        })

      const dispatch = (pending: ReadonlyArray<Pending>): Effect.Effect<void> => {
        const groups = new Map<string, Array<Pending>>()
        for (const entry of pending) {
          const key = `${endpointKey(entry.target.endpoint)}${entry.target.asking ? "#asking" : ""}`
          const group = groups.get(key)
          if (group === undefined) {
            groups.set(key, [entry])
          } else group.push(entry)
        }
        return Effect.forEach(groups.values(), process, { concurrency: "unbounded", discard: true })
      }

      const pending: Array<Pending> = []
      commands.forEach((command, index) => {
        if (requiresReservation(command.arguments)) {
          results[index] = Result.fail(reservationRequired())
          return
        }
        const next = route(index, maxRedirects)
        if (next !== undefined) {
          pending.push(next)
        }
      })
      return Effect.as(dispatch(pending), results)
    })

  // Single commands avoid the pipeline's grouping, but follow the same
  // redirect, READONLY and disconnect rules.
  const attempt = (args: ReadonlyArray<Protocol.Argument>, target: Topology.Resolved) => {
    if (target.asking) {
      return Effect.scoped(
        Effect.flatMap(
          reserve({ node: target.endpoint }),
          (connection) => Effect.andThen(connection.execute(["ASKING"]), connection.execute(args))
        )
      )
    }
    const current = sharedFor(target.endpoint)?.current
    return current?.isOpen()
      ? current.execute(args)
      : Effect.flatMap(connect(target.endpoint), (connection) => connection.execute(args))
  }

  const recover = (
    args: ReadonlyArray<Protocol.Argument>,
    routing: Command.Routing | undefined,
    target: Topology.Resolved,
    remaining: number,
    error: RedisError
  ): Effect.Effect<Protocol.Reply, RedisError> => {
    if (closed) return Effect.fail(error)
    const redirect = topology.redirect(error, target.endpoint)
    if (redirect !== undefined) {
      return remaining > 0 ? send(args, routing, redirect, remaining - 1) : Effect.fail(Cluster.redirectLimit(error))
    }
    if (topology._tag === "Sentinel" && error.code === "READONLY" && remaining > 0) {
      return Effect.flatMap(refresh, () => {
        const next = topology.route(args, routing)
        return next._tag === "Failure" ? Effect.fail(next.failure) : send(args, routing, next.success, remaining - 1)
      })
    }
    return isDisconnect(error) ? Effect.andThen(Effect.ignore(refresh), Effect.fail(error)) : Effect.fail(error)
  }

  const send = (
    args: ReadonlyArray<Protocol.Argument>,
    routing: Command.Routing | undefined,
    target: Topology.Resolved,
    remaining: number
  ): Effect.Effect<Protocol.Reply, RedisError> =>
    Effect.catch(attempt(args, target), (error) => recover(args, routing, target, remaining, error))

  // Per-connection timeouts need the Effect path; otherwise an open shared
  // connection takes the command synchronously inside one callback.
  const direct = config.commandTimeout === undefined

  const execute: RedisClient["execute"] = (args, routing) =>
    Effect.callback((resume) => {
      if (closed) return resume(Effect.fail(clientClosed()))
      if (requiresReservation(args)) return resume(Effect.fail(reservationRequired()))
      const target = topology.route(args, routing)
      if (target._tag === "Failure") return resume(Effect.fail(target.failure))
      const current = direct && !target.success.asking ? sharedFor(target.success.endpoint)?.current : undefined
      if (current === undefined || !current.isOpen()) return resume(send(args, routing, target.success, maxRedirects))
      return Effect.sync(current.submitUnsafe(args, (result) =>
        resume(
          result._tag === "Success"
            ? Effect.succeed(result.success)
            : recover(args, routing, target.success, maxRedirects, result.failure)
        )))
    })

  const run = <A>(command: Command.RedisCommand<A>): Effect.Effect<A, RedisError> =>
    Effect.flatMap(execute(command.arguments, command.routing), (reply) => Effect.fromResult(command.decode(reply)))

  const client: RedisClient = {
    config,
    closed: Deferred.await(closedSignal),
    execute,
    run,
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

const standalone = (endpoint: Connection.Endpoint): Topology.Topology => {
  const resolved: Result.Result<Topology.Resolved, RedisError> = Result.succeed({ endpoint })
  return {
    _tag: "Standalone",
    route: (_args, routing) => routing?.node === undefined ? resolved : Result.succeed({ endpoint: routing.node }),
    resolve: (_args, routing) => Effect.succeed({ endpoint: routing?.node ?? endpoint }),
    refresh: Effect.void,
    endpoints: () => [endpoint],
    redirect: () => undefined,
    onChange: () => () => {}
  }
}

/**
 * Client settings with portable socket addresses and Redis URLs.
 *
 * **Details**
 *
 * Explicit settings override the URL. Use `topology` for Cluster seeds or
 * Sentinel discovery. RESP2 is the default; select `protocol: 3` for RESP3.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Options extends Config {
  readonly url?: string | Redacted.Redacted<string> | undefined
  readonly socket?: Partial<Pick<SocketConnector.Endpoint, "host" | "port" | "path" | "tls">> | undefined
  readonly connectTimeout?: Duration.Input | undefined
}

/**
 * Acquires a scoped Redis client using the platform socket connector.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeWithPlatform = Effect.fnUntraced(function*(options: Options = {}) {
  const { connectTimeout, socket, url: urlOption, ...config } = options
  const sockets = yield* SocketConnector.SocketConnector
  const invalid = (message: string) => new RedisError({ reason: "Connection", message, outcome: "NotSent" })
  let url: URL | undefined
  if (urlOption !== undefined) {
    const source = Redacted.isRedacted(urlOption) ? Redacted.value(urlOption) : urlOption
    url = yield* Effect.try({ try: () => new URL(source), catch: () => invalid("Invalid Redis URL") })
    if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
      return yield* Effect.fail(invalid("Redis URL must use redis or rediss"))
    }
  }
  const database = config.database ?? (url?.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0)
  const port = socket?.port ?? (url?.port ? Number(url.port) : 6379)
  if (!Number.isSafeInteger(database) || database < 0 || !Number.isSafeInteger(port) || port < 1 || port > 65535) {
    return yield* Effect.fail(invalid("Invalid Redis port or database"))
  }
  const decode = (value: string | undefined) =>
    Effect.try({
      try: () => value ? decodeURIComponent(value) : undefined,
      catch: () => invalid("Invalid Redis URL credential encoding")
    })
  const password = config.password ?? (yield* decode(url?.password))
  const tls = socket?.tls ?? url?.protocol === "rediss:"
  return yield* make(Connection.fromSocketConnector(sockets, { connectTimeout }), {
    ...config,
    username: config.username ?? (yield* decode(url?.username)),
    password: typeof password === "string" ? Redacted.make(password) : password,
    database,
    topology: config.topology ?? {
      _tag: "Standalone",
      endpoint: {
        host: socket?.host ?? url?.hostname.replace(/^\[(.*)\]$/, "$1") ?? "127.0.0.1",
        port,
        path: socket?.path,
        tls: typeof tls === "object" ? { ...tls } : tls
      }
    }
  })
})

/**
 * Provides a Redis client using the platform socket connector.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options?: Options): Layer.Layer<RedisClient, RedisError, SocketConnector.SocketConnector> =>
  Layer.effect(RedisClient, makeWithPlatform(options))

/**
 * Provides a Redis client from Effect configuration and platform sockets.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  options: Configuration.Wrap<Options>
): Layer.Layer<RedisClient, RedisError | Configuration.ConfigError, SocketConnector.SocketConnector> =>
  Layer.effect(RedisClient, Configuration.unwrap(options).pipe(Effect.flatMap(makeWithPlatform)))

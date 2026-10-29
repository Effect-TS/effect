/**
 * Node.js Redis integration backed by `redis` (node-redis).
 *
 * This module creates a scoped `node-redis` client and exposes it in two forms:
 * the generic `Redis` service and the {@link NodeRedis} service for direct
 * access to the underlying client. `layer` accepts node-redis client options
 * directly, while `layerConfig` reads them from Effect config. Both also accept
 * `Redis.PoolOptions` for the connections behind `Redis.reserve`. `node-redis`
 * connects explicitly, so layer construction can fail with a `RedisError`.
 * Both layers close the client when the layer scope ends. Requires `redis`
 * 6.3.0 or later.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fn from "effect/Function"
import * as Layer from "effect/Layer"
import * as Redis from "effect/persistence/Redis"
import { createClient, SocketTimeoutError } from "redis"

type NodeRedisClient = ReturnType<typeof createClient>
type NodeRedisClientOptions = NonNullable<Parameters<typeof createClient>[0]>
type NodeRedisOptions = NodeRedisClientOptions & Redis.PoolOptions

/**
 * Service tag for the Node Redis integration, exposing the underlying
 * `node-redis` client and a `use` helper that maps client failures to
 * `RedisError`.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class NodeRedis extends Context.Service<NodeRedis, {
  readonly client: NodeRedisClient
  readonly use: <A>(f: (client: NodeRedisClient) => Promise<A>) => Effect.Effect<A, Redis.RedisError>
}>()("@effect/platform-node/NodeRedis") {}

// node-redis cannot destroy a socket that is still connecting, so clients that
// reconnect get a socket signal that `destroy` aborts.
const makeSocket = (
  socket: NodeRedisClientOptions["socket"],
  signal: AbortSignal,
  isReady: () => boolean
) => {
  // node-redis' TLS option type omits `signal`, which `tls.connect` accepts.
  const callerSignal = socket && "signal" in socket ? socket.signal : undefined
  return {
    ...socket,
    signal: callerSignal ? AbortSignal.any([callerSignal, signal]) : signal,
    reconnectStrategy: socket?.reconnectStrategy ?? ((retries, cause) => {
      if (!isReady()) return cause
      if (cause instanceof SocketTimeoutError) return false
      const jitter = Math.floor(Math.random() * 200)
      const delay = Math.min(2 ** retries * 50, 2000)
      return delay + jitter
    })
  }
}

// Destroying first leaves the abort only an untracked, still-connecting socket
// to close, so it raises no client error.
const destroy = (client: NodeRedisClient, abort: AbortController) => {
  client.destroy()
  abort.abort()
}

const make = Effect.fnUntraced(function*(
  { acquireTimeout, idleTimeout, maxConnections, minConnections, ...options }: NodeRedisOptions = {}
) {
  const socket = options.socket
  const abort = new AbortController()
  let ready = false
  const client = yield* Effect.acquireRelease(
    Effect.sync(() => createClient({ ...options, socket: makeSocket(socket, abort.signal, () => ready) })),
    (client) =>
      Effect.andThen(
        // Ready clients get a bounded graceful close, letting in-flight
        // commands finish.
        ready ? Effect.ignoreCause(Effect.timeout(Effect.promise(() => client.close()), "1 second")) : Effect.void,
        Effect.sync(() => destroy(client, abort))
      )
  )
  client.once("ready", () => {
    ready = true
  })

  // node-redis rethrows `error` events that have no listener, which would crash
  // the process on a transient socket failure. Command failures are still
  // reported as `RedisError`.
  const runSync = Effect.runSyncWith(yield* Effect.context<never>())
  client.on("error", (cause) => {
    runSync(Effect.logWarning("NodeRedis client error", cause))
  })

  yield* Effect.tryPromise({
    try: () => client.connect(),
    catch: (cause) => new Redis.RedisError({ cause })
  })

  const use = <A>(f: (client: NodeRedisClient) => Promise<A>) =>
    Effect.tryPromise({
      try: () => f(client),
      catch: (cause) => new Redis.RedisError({ cause })
    })

  const sendWith =
    (client: NodeRedisClient) =>
    <A = unknown>(command: string, ...args: ReadonlyArray<string>): Effect.Effect<A, Redis.RedisError> =>
      Effect.tryPromise({
        try: () => client.sendCommand([command, ...args]) as Promise<A>,
        catch: (cause) => new Redis.RedisError({ cause })
      })

  const redis = yield* Redis.make({
    send: sendWith(client),
    // Reserved connections do not reconnect: a dropped socket fails the
    // in-flight command and the connection leaves the pool.
    connect: Effect.tryPromise({
      try: async () => {
        const connection = client.duplicate({ socket: { ...socket, reconnectStrategy: false } })
        connection.on("error", (cause) => {
          runSync(Effect.logWarning("NodeRedis reserved connection error", cause))
        })
        try {
          await connection.connect()
          return connection
        } catch (cause) {
          connection.destroy()
          throw cause
        }
      },
      catch: (cause) => new Redis.RedisError({ cause })
    }).pipe(
      Effect.map((connection) => ({
        send: sendWith(connection),
        // `destroy` rejects in-flight commands instead of waiting for their
        // replies like `close` does.
        close: Effect.sync(() => connection.destroy())
      }))
    ),
    pool: { acquireTimeout, idleTimeout, maxConnections, minConnections },
    subscribe: Effect.fnUntraced(function*(channel, onMessage) {
      const terminal = yield* Deferred.make<void, Redis.RedisError>()
      const abort = new AbortController()
      yield* Effect.acquireRelease(
        Effect.tryPromise({
          try: async () => {
            let subscriberReady = false
            const subscriber = client.duplicate({ socket: makeSocket(socket, abort.signal, () => subscriberReady) })
            subscriber.once("ready", () => {
              subscriberReady = true
            })
            subscriber.on("error", (cause) => {
              runSync(Effect.logWarning("NodeRedis subscriber error", cause))
              if (!subscriber.isOpen) {
                runSync(Deferred.fail(terminal, new Redis.RedisError({ cause })))
              }
            })
            try {
              await subscriber.connect()
              await subscriber.subscribe(channel, (message, channel) => {
                onMessage({ channel, message })
              })
              return subscriber
            } catch (cause) {
              destroy(subscriber, abort)
              throw cause
            }
          },
          catch: (cause) => new Redis.RedisError({ cause })
        }),
        (subscriber) => Effect.sync(() => destroy(subscriber, abort))
      )
      return Deferred.await(terminal)
    })
  })

  const nodeRedis = Fn.identity<NodeRedis["Service"]>({
    client,
    use
  })

  return Context.make(NodeRedis, nodeRedis).pipe(
    Context.add(Redis.Redis, redis)
  )
})

/**
 * Provides `Redis` and `NodeRedis` services backed by a `node-redis` client
 * created with the supplied options, connected when the layer is built and
 * closed when the layer scope ends.
 *
 * **Details**
 *
 * By default, the initial connection fails on its first connection error. A
 * caller-supplied `socket.reconnectStrategy` is used instead when present. Once
 * the client has emitted `ready`, the default reconnect strategy uses
 * node-redis' exponential backoff and stops on socket timeouts.
 *
 * Scope finalization destroys the shared client, including any connection
 * attempt in progress. A ready client first gets one second to close
 * gracefully, after which commands still in flight fail. This bound applies to
 * the shared client only: a reserved connection or subscriber that is still
 * connecting delays scope finalization until its connection attempt settles.
 * Run blocking commands on `Redis.reserve`: reserved connections are destroyed
 * when their scope closes, failing their in-flight commands.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options?: NodeRedisOptions | undefined
): Layer.Layer<Redis.Redis | NodeRedis, Redis.RedisError> => Layer.effectContext(make(options))

/**
 * Provides `Redis` and `NodeRedis` services from `Config`-backed node-redis
 * client options, connecting the client when the layer is built and closing it
 * when the layer scope ends.
 *
 * **Details**
 *
 * By default, the initial connection fails on its first connection error. A
 * caller-supplied `socket.reconnectStrategy` is used instead when present. Once
 * the client has emitted `ready`, the default reconnect strategy uses
 * node-redis' exponential backoff and stops on socket timeouts.
 *
 * Scope finalization destroys the shared client, including any connection
 * attempt in progress. A ready client first gets one second to close
 * gracefully, after which commands still in flight fail. This bound applies to
 * the shared client only: a reserved connection or subscriber that is still
 * connecting delays scope finalization until its connection attempt settles.
 * Run blocking commands on `Redis.reserve`: reserved connections are destroyed
 * when their scope closes, failing their in-flight commands.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig: (
  options: Config.Wrap<NodeRedisOptions>
) => Layer.Layer<Redis.Redis | NodeRedis, Redis.RedisError | Config.ConfigError> = (
  options: Config.Wrap<NodeRedisOptions>
): Layer.Layer<Redis.Redis | NodeRedis, Redis.RedisError | Config.ConfigError> =>
  Layer.effectContext(
    Config.unwrap(options).pipe(
      Effect.flatMap(make)
    )
  )

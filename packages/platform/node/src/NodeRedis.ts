/**
 * Node.js Redis integration backed by `redis` (node-redis).
 *
 * This module creates a scoped `node-redis` client and exposes it in two forms:
 * the generic `Redis` service and the {@link NodeRedis} service for direct
 * access to the underlying client. `layer` accepts node-redis client options
 * directly, while `layerConfig` reads them from Effect config. `node-redis`
 * connects explicitly, so layer construction can fail with a `RedisError`.
 * Both layers close the client when the layer scope ends.
 *
 * @since 4.0.0
 */
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Fn from "effect/Function"
import * as Layer from "effect/Layer"
import * as Redis from "effect/unstable/persistence/Redis"
import { createClient, type RedisClientOptions, type RedisClientType } from "redis"

/**
 * Service tag for the Node Redis integration, exposing the underlying
 * `node-redis` client and a `use` helper that maps client failures to
 * `RedisError`.
 *
 * @category services
 * @since 4.0.0
 */
export class NodeRedis extends Context.Service<NodeRedis, {
  readonly client: RedisClientType
  readonly use: <A>(f: (client: RedisClientType) => Promise<A>) => Effect.Effect<A, Redis.RedisError>
}>()("@effect/platform-node/NodeRedis") {}

const make = Effect.fnUntraced(function*(
  options?: RedisClientOptions
) {
  const client = yield* Effect.acquireRelease(
    Effect.sync((): RedisClientType => createClient(options)),
    (client) => Effect.ignore(Effect.tryPromise(() => client.close()))
  )

  // node-redis rethrows `error` events that have no listener, which would crash
  // the process on a transient socket failure. Command failures are still
  // reported as `RedisError`, so these are only logged at debug level.
  const runFork = Effect.runForkWith(yield* Effect.context<never>())
  client.on("error", (cause) => {
    runFork(Effect.logDebug("NodeRedis client error", cause))
  })

  yield* Effect.tryPromise({
    try: () => client.connect(),
    catch: (cause) => new Redis.RedisError({ cause })
  })

  const use = <A>(f: (client: RedisClientType) => Promise<A>) =>
    Effect.tryPromise({
      try: () => f(client),
      catch: (cause) => new Redis.RedisError({ cause })
    })

  const redis = yield* Redis.make({
    send: <A = unknown>(command: string, ...args: ReadonlyArray<string>) =>
      Effect.tryPromise({
        try: () => client.sendCommand([command, ...args]) as Promise<A>,
        catch: (cause) => new Redis.RedisError({ cause })
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
 * `node-redis` retries the initial connection using `socket.reconnectStrategy`,
 * which by default backs off and retries indefinitely. Pass
 * `socket: { reconnectStrategy: false }` to fail the layer on the first
 * connection error instead.
 *
 * @category layers
 * @since 4.0.0
 */
export const layer = (
  options?: RedisClientOptions | undefined
): Layer.Layer<Redis.Redis | NodeRedis, Redis.RedisError> => Layer.effectContext(make(options))

/**
 * Provides `Redis` and `NodeRedis` services from `Config`-backed node-redis
 * client options, connecting the client when the layer is built and closing it
 * when the layer scope ends.
 *
 * @category layers
 * @since 4.0.0
 */
export const layerConfig: (
  options: Config.Wrap<RedisClientOptions>
) => Layer.Layer<Redis.Redis | NodeRedis, Redis.RedisError | Config.ConfigError> = (
  options: Config.Wrap<RedisClientOptions>
): Layer.Layer<Redis.Redis | NodeRedis, Redis.RedisError | Config.ConfigError> =>
  Layer.effectContext(
    Config.unwrap(options).pipe(
      Effect.flatMap(make)
    )
  )

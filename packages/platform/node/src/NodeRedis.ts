/**
 * Native Node.js Redis clients over TCP, TLS, and Unix sockets.
 *
 * Provides standalone, Cluster, and Sentinel clients together with the Redis
 * persistence adapter, without an external Redis driver.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Shared from "@effect/platform-node-shared/NodeRedis"
import * as RedisClient from "@effect/redis/RedisClient"
import type { RedisError } from "@effect/redis/RedisError"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Redis from "effect/persistence/Redis"

/**
 * Native client configuration with Node socket and URL settings.
 *
 * **Details**
 *
 * Explicit fields override URL settings. Use `topology` for Cluster seeds or
 * Sentinel discovery. RESP2 is the default; select `protocol: 3` for RESP3.
 * TLS certificate verification is enabled by default.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Options extends Shared.Options {}

/**
 * Service tag for the native Node Redis client.
 *
 * **Details**
 *
 * Use `execute` for lossless raw replies, `run` for checked descriptors, and
 * `reserve` for stateful or blocking work. Operations return Effects.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class NodeRedis
  extends Context.Service<NodeRedis, RedisClient.RedisClient>()("@effect/platform-node/NodeRedis")
{}

/**
 * Acquires a native scoped client and validates its initial connection.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Shared.make

const makeContext = Effect.fnUntraced(function*(options: Options = {}) {
  const context = yield* Shared.makeContext(options)
  return Context.add(context, NodeRedis, Context.get(context, RedisClient.RedisClient))
})

/**
 * Provides native Node Redis, general client, and persistence adapter services.
 *
 * **Details**
 *
 * Cluster persistence groups related keys with hash tags per cache namespace,
 * queue, or rate limiter. Standalone and Sentinel retain their existing key
 * layouts. Moving persisted data into Cluster requires a key migration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options?: Options): Layer.Layer<NodeRedis | RedisClient.RedisClient | Redis.Redis, RedisError> =>
  Layer.effectContext(makeContext(options))

/**
 * Provides native Redis services from Effect configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (
  options: Config.Wrap<Options>
): Layer.Layer<NodeRedis | RedisClient.RedisClient | Redis.Redis, RedisError | Config.ConfigError> =>
  Layer.effectContext(Config.unwrap(options).pipe(Effect.flatMap(makeContext)))

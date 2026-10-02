/**
 * Native Redis clients for Deno over TCP, TLS, and Unix sockets.
 *
 * Provides standalone, Cluster, and Sentinel clients together with the Redis
 * persistence adapter through Deno's Node compatibility APIs.
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
 * Native client configuration with socket settings and Redis URLs.
 *
 * **Details**
 *
 * Explicit settings override URL authority credentials, the pathname database,
 * and connection settings. Query parameters do not configure the connection.
 * Use `socket.host` for the hostname and `topology` for Cluster or Sentinel.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Options extends Shared.Options {}

/**
 * Service tag for Deno's native Redis client.
 *
 * **Details**
 *
 * Use `execute` for raw replies, `run` for checked descriptors, and `reserve`
 * for stateful or blocking work. Operations return Effects.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class DenoRedis
  extends Context.Service<DenoRedis, RedisClient.RedisClient>()("@effect/platform-deno/DenoRedis")
{}

/**
 * Acquires a scoped native client and validates its initial connection.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Shared.make

const makeContext = (options?: Options) =>
  Shared.makeContext(options).pipe(
    Effect.map((context) => Context.add(context, DenoRedis, Context.get(context, RedisClient.RedisClient)))
  )

/**
 * Provides Deno Redis, general client, and persistence adapter services.
 *
 * **Details**
 *
 * Cluster persistence groups related keys with hash tags per cache namespace,
 * queue, or rate limiter. Moving persisted data into Cluster requires a key
 * migration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options?: Options): Layer.Layer<DenoRedis | RedisClient.RedisClient | Redis.Redis, RedisError> =>
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
): Layer.Layer<DenoRedis | RedisClient.RedisClient | Redis.Redis, RedisError | Config.ConfigError> =>
  Layer.effectContext(Config.unwrap(options).pipe(Effect.flatMap(makeContext)))

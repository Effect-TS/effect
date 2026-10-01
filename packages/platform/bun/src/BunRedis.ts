/**
 * Native Redis services for Bun over TCP, TLS, and Unix sockets.
 *
 * Provides standalone, Cluster, and Sentinel clients together with the Redis
 * persistence adapter using Bun's Node compatibility APIs.
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
 * Native Redis configuration for Bun sockets and topology discovery.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Options extends Shared.Options {}

/**
 * Service tag for the native Bun Redis client.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class BunRedis extends Context.Service<BunRedis, RedisClient.RedisClient>()("@effect/platform-bun/BunRedis") {}

/**
 * Acquires a native scoped client and validates its initial connection.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Shared.make

const makeContext = (options?: Options) =>
  Shared.makeContext(options).pipe(
    Effect.map((context) => Context.add(context, BunRedis, Context.get(context, RedisClient.RedisClient)))
  )

/**
 * Provides native Bun Redis, general client, and persistence adapter services.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options?: Options): Layer.Layer<BunRedis | RedisClient.RedisClient | Redis.Redis, RedisError> =>
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
): Layer.Layer<BunRedis | RedisClient.RedisClient | Redis.Redis, RedisError | Config.ConfigError> =>
  Layer.effectContext(Config.unwrap(options).pipe(Effect.flatMap(makeContext)))

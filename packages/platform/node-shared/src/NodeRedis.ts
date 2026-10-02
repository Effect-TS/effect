/**
 * Shared native Redis clients over Node-compatible TCP, TLS, and Unix sockets.
 *
 * Provides standalone, Cluster, and Sentinel clients together with the Redis
 * persistence adapter, without an external Redis driver.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as RedisClient from "effect/redis/RedisClient"
import type { Endpoint } from "effect/redis/RedisConnection"
import * as RedisPersistence from "effect/redis/RedisPersistence"
import * as SocketConnector from "effect/socket/SocketConnector"
import type { Duplex } from "node:stream"
import * as NodeCrypto from "./NodeCrypto.ts"
import * as NodeSocketConnector from "./NodeSocketConnector.ts"

/**
 * Redis configuration with an optional Node-compatible stream factory.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Options extends RedisClient.Options {
  readonly stream?: ((endpoint: Endpoint) => Duplex) | undefined
}

const sockets = (options?: Options) => NodeSocketConnector.make({ stream: options?.stream })
const clientOptions = (options?: Options): RedisClient.Options => {
  const { stream: _stream, ...config } = options ?? {}
  return config
}

/**
 * Acquires a native Redis client using Node-compatible platform sockets.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = (options?: Options) =>
  RedisClient.makeWithPlatform(clientOptions(options)).pipe(
    Effect.provideService(SocketConnector.SocketConnector, sockets(options))
  )

/**
 * Acquires Redis client and persistence services using platform capabilities.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeContext = (options?: Options) =>
  RedisPersistence.makeContext(clientOptions(options)).pipe(
    Effect.provideService(SocketConnector.SocketConnector, sockets(options)),
    Effect.provide(NodeCrypto.layer)
  )

/**
 * Provides native Redis client and persistence adapter services.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options?: Options) => Layer.effectContext(makeContext(options))

/**
 * Provides native Redis services from Effect configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options: Config.Wrap<Options>) =>
  Layer.effectContext(Config.unwrap(options).pipe(Effect.flatMap(makeContext)))

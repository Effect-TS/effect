/**
 * Native Node.js Redis clients over TCP, TLS, and Unix sockets.
 *
 * Provides standalone, Cluster, and Sentinel clients together with the Redis
 * persistence adapter, without an external Redis driver.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as RedisClient from "@effect/redis/RedisClient"
import type { Endpoint } from "@effect/redis/RedisConnection"
import { RedisError } from "@effect/redis/RedisError"
import * as RedisProtocol from "@effect/redis/RedisProtocol"
import * as RedisSubscription from "@effect/redis/RedisSubscription"
import * as Config from "effect/Config"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redis from "effect/persistence/Redis"
import * as Queue from "effect/Queue"
import * as Redacted from "effect/Redacted"
import type { Duplex } from "node:stream"
import type * as Tls from "node:tls"
import { makeConnector } from "./internal/redisTransport.ts"

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
export interface Options extends RedisClient.Config {
  readonly url?: string | Redacted.Redacted<string> | undefined
  readonly socket?: {
    readonly host?: string | undefined
    readonly port?: number | undefined
    readonly path?: string | undefined
    readonly tls?: boolean | Tls.ConnectionOptions | undefined
  } | undefined
  readonly connectTimeout?: Duration.Input | undefined
  readonly stream?: ((endpoint: Endpoint) => Duplex) | undefined
}

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
export const make = Effect.fnUntraced(function*(options: Options = {}) {
  let url: URL | undefined
  if (options.url !== undefined) {
    const source = Redacted.isRedacted(options.url) ? Redacted.value(options.url) : options.url
    url = yield* Effect.try({
      try: () => new URL(source),
      catch: () => new RedisError({ reason: "Connection", message: "Invalid Redis URL", outcome: "NotSent" })
    })
    if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
      return yield* Effect.fail(
        new RedisError({ reason: "Connection", message: "Redis URL must use redis or rediss", outcome: "NotSent" })
      )
    }
  }
  const database = options.database ?? (url?.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0)
  const port = options.socket?.port ?? (url?.port ? Number(url.port) : 6379)
  if (!Number.isSafeInteger(database) || database < 0 || !Number.isSafeInteger(port) || port < 1 || port > 65535) {
    return yield* Effect.fail(
      new RedisError({ reason: "Connection", message: "Invalid Redis port or database", outcome: "NotSent" })
    )
  }
  const decoded = (value: string | undefined) =>
    Effect.try({
      try: () => value ? decodeURIComponent(value) : undefined,
      catch: () =>
        new RedisError({ reason: "Connection", message: "Invalid Redis URL credential encoding", outcome: "NotSent" })
    })
  const username = options.username ?? (yield* decoded(url?.username))
  const password = options.password ?? (yield* decoded(url?.password))
  const tls = options.socket?.tls ?? (url?.protocol === "rediss:")
  return yield* RedisClient.make(makeConnector({ connectTimeout: options.connectTimeout, stream: options.stream }), {
    username,
    password: typeof password === "string" ? Redacted.make(password) : password,
    database,
    protocol: options.protocol,
    clientName: options.clientName,
    commandTimeout: options.commandTimeout,
    maxPendingCommands: options.maxPendingCommands,
    maxQueuedBytes: options.maxQueuedBytes,
    maxFrameSize: options.maxFrameSize,
    maxDepth: options.maxDepth,
    maxAggregateLength: options.maxAggregateLength,
    reconnectDelay: options.reconnectDelay,
    topology: options.topology ?? {
      _tag: "Standalone",
      endpoint: {
        host: options.socket?.host ?? url?.hostname.replace(/^\[|\]$/g, "") ?? "127.0.0.1",
        port,
        path: options.socket?.path,
        tls: typeof tls === "object" ? { ...tls } : tls
      }
    }
  })
})

const makeContext = Effect.fnUntraced(function*(options: Options = {}) {
  const client = yield* make(options)
  if (options.topology?._tag === "Cluster") {
    const unsupported = Effect.fail(
      new Redis.RedisError({
        cause: new RedisError({
          reason: "Routing",
          message: "The persistence Redis adapter requires standalone or Sentinel topology"
        })
      })
    )
    const adapter = yield* Redis.make({ send: () => unsupported, subscribe: () => unsupported })
    return Context.make(NodeRedis, client).pipe(
      Context.add(RedisClient.RedisClient, client),
      Context.add(Redis.Redis, adapter)
    )
  }
  const adapter = yield* Redis.make({
    send: <A = unknown>(command: string, ...args: ReadonlyArray<string>) =>
      client.execute([command, ...args]).pipe(
        Effect.flatMap((reply) =>
          Effect.try({
            try: () => RedisProtocol.toValue(reply) as A,
            catch: (cause) => new Redis.RedisError({ cause })
          })
        ),
        Effect.mapError((cause) => cause instanceof Redis.RedisError ? cause : new Redis.RedisError({ cause }))
      ),
    subscribe: (channel, onMessage) =>
      Effect.gen(function*() {
        const subscription = yield* RedisSubscription.make(client, channel).pipe(
          Effect.mapError((cause) => new Redis.RedisError({ cause }))
        )
        return Effect.forever(
          Queue.take(subscription.messages).pipe(
            Effect.mapError((cause) => new Redis.RedisError({ cause })),
            Effect.flatMap((message) =>
              Effect.sync(() =>
                onMessage({
                  channel: new TextDecoder().decode(message.channel),
                  message: new TextDecoder().decode(message.message)
                })
              )
            )
          )
        )
      })
  })
  return Context.make(NodeRedis, client).pipe(
    Context.add(RedisClient.RedisClient, client),
    Context.add(Redis.Redis, adapter)
  )
})

/**
 * Provides native Node Redis, general client, and persistence adapter services.
 *
 * **Gotchas**
 *
 * The persistence adapter supports standalone and Sentinel. Its existing key
 * formats do not guarantee Cluster slot affinity. The general client supports
 * all three topologies.
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

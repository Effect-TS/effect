/**
 * Shared native Redis clients over Node-compatible TCP, TLS, and Unix sockets.
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
import { createHash } from "node:crypto"
import type { Duplex } from "node:stream"
import type * as Tls from "node:tls"
import { makeConnector } from "./internal/redisTransport.ts"

const decoder = new TextDecoder()

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
 * Acquires a native scoped client and validates its initial connection.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(options: Options = {}) {
  const { connectTimeout, socket, stream, url: urlOption, ...config } = options
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
  return yield* RedisClient.make(makeConnector({ connectTimeout, stream }), {
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
 * Acquires native Redis client and persistence services in one scoped context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeContext = Effect.fnUntraced(function*(options: Options = {}) {
  const client = yield* make(options)
  const cluster = options.topology?._tag === "Cluster"
  const toValue = {
    onFailure: (cause: RedisError) => Effect.fail(new Redis.RedisError({ cause })),
    onSuccess: (reply: RedisProtocol.Reply) => {
      try {
        return Effect.succeed(RedisProtocol.toValue(reply))
      } catch (cause) {
        return Effect.fail(new Redis.RedisError({ cause }))
      }
    }
  }
  const sendTo =
    (node?: Endpoint): Redis.Redis["Service"]["send"] =>
    <A = unknown>(command: string, ...args: ReadonlyArray<string>) =>
      Effect.matchEffect(
        client.execute([command, ...args], node === undefined ? undefined : { node, keyIndexes: [] }),
        toValue
      ) as Effect.Effect<A, Redis.RedisError>
  const adapter = yield* Redis.make({
    cluster,
    scriptHash: (lua) =>
      Effect.try({
        try: () => createHash("sha1").update(lua).digest("hex"),
        catch: (cause) => new Redis.RedisError({ cause })
      }),
    scan: Effect.fnUntraced(function*(pattern: string) {
      const nodes = yield* client.nodes
      const batches = yield* Effect.forEach(nodes, (node) => Redis.scan(sendTo(node), pattern), { concurrency: 16 })
      return Array.from(new Set(batches.flat()))
    }),
    send: sendTo(),
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
                onMessage({ channel: decoder.decode(message.channel), message: decoder.decode(message.message) })
              )
            )
          )
        )
      })
  })
  return Context.make(RedisClient.RedisClient, client).pipe(
    Context.add(Redis.Redis, adapter)
  )
})

/**
 * Provides native Redis client and persistence adapter services.
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
export const layer = (options?: Options): Layer.Layer<RedisClient.RedisClient | Redis.Redis, RedisError> =>
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
): Layer.Layer<RedisClient.RedisClient | Redis.Redis, RedisError | Config.ConfigError> =>
  Layer.effectContext(Config.unwrap(options).pipe(Effect.flatMap(makeContext)))

/**
 * Redis persistence services built from the native platform-independent client.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Config from "../Config.ts"
import * as Context from "../Context.ts"
import * as Crypto from "../Crypto.ts"
import * as Effect from "../Effect.ts"
import * as Hex from "../encoding/Hex.ts"
import * as Layer from "../Layer.ts"
import * as Redis from "../persistence/Redis.ts"
import * as Queue from "../Queue.ts"
import * as RedisClient from "./RedisClient.ts"
import type { Endpoint } from "./RedisConnection.ts"
import type { RedisError } from "./RedisError.ts"
import * as RedisProtocol from "./RedisProtocol.ts"
import * as RedisSubscription from "./RedisSubscription.ts"

const decoder = new TextDecoder()
const encoder = new TextEncoder()

/**
 * Creates a persistence service backed by a native Redis client.
 *
 * **Details**
 *
 * Cluster scans cover all primary nodes. Lua script hashes use the platform
 * cryptography service without loading scripts over the network.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(function*(client: RedisClient.RedisClient) {
  const crypto = yield* Crypto.Crypto
  const cluster = client.config.topology?._tag === "Cluster"
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
      crypto.digest("SHA-1", encoder.encode(lua)).pipe(
        Effect.map(Hex.encode),
        Effect.mapError((cause) => new Redis.RedisError({ cause }))
      ),
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
  return adapter
})

/**
 * Acquires a native client and persistence adapter in one scoped context.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeContext = Effect.fnUntraced(function*(options?: RedisClient.Options) {
  const client = yield* RedisClient.makeWithPlatform(options)
  const adapter = yield* make(client)
  return Context.make(RedisClient.RedisClient, client).pipe(Context.add(Redis.Redis, adapter))
})

/**
 * Provides Redis client and persistence services using platform capabilities.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer = (options?: RedisClient.Options) => Layer.effectContext(makeContext(options))

/**
 * Provides Redis client and persistence services from Effect configuration.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerConfig = (options: Config.Wrap<RedisClient.Options>) =>
  Layer.effectContext(Config.unwrap(options).pipe(Effect.flatMap(makeContext)))

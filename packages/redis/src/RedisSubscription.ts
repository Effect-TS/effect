/**
 * Scoped channel, pattern, and sharded Redis subscriptions.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import { notSent } from "./internal/transport.ts"
import type { RedisClient } from "./RedisClient.ts"
import type { Endpoint, RedisConnection } from "./RedisConnection.ts"
import { RedisError } from "./RedisError.ts"
import type * as Protocol from "./RedisProtocol.ts"

/**
 * Binary Redis publication, optionally matched by a subscribed pattern.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Message {
  readonly channel: Uint8Array
  readonly message: Uint8Array
  readonly pattern?: Uint8Array | undefined
}

/**
 * Subscription mode and bounded message capacity.
 *
 * @stability unstable
 * @category configuration
 * @since 4.0.0
 */
export interface Options {
  readonly mode?: "channel" | "pattern" | "sharded" | undefined
  /** Maximum number of unconsumed messages. Defaults to 1024. */
  readonly capacity?: number | undefined
}

/**
 * Acknowledged subscription whose messages terminate when its scope closes.
 *
 * **Gotchas**
 *
 * Messages published while reconnecting are lost. Exceeding the capacity
 * fails the subscription with a `Capacity` error rather than dropping
 * messages. Each subscription uses its own connection. Closing the client
 * fails the subscription with a `Closed` error.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface RedisSubscription {
  readonly messages: Queue.Dequeue<Message, RedisError>
  readonly close: Effect.Effect<void>
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const bytesOf = (reply: Protocol.Reply | undefined): Uint8Array | undefined =>
  reply?._tag === "BlobString" ? reply.value : reply?._tag === "SimpleString" ? encoder.encode(reply.value) : undefined

const redirectPattern = /^(MOVED|ASK) \d+ (\S*):(\d+)$/

interface Generation {
  readonly scope: Scope.Closeable
  readonly connection: RedisConnection
  /** Completes when Redis drops a sharded subscription after a slot migration. */
  readonly restart: Deferred.Deferred<void>
}

/**
 * Acquires an acknowledged subscription and restores it after connection loss.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make = Effect.fnUntraced(
  function*(client: RedisClient, channel: Protocol.Argument, options: Options = {}) {
    const capacity = options.capacity ?? 1024
    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      return yield* Effect.fail(notSent("Capacity", "Subscription capacity must be a positive integer"))
    }
    const mode = options.mode ?? "channel"
    const command = mode === "pattern" ? "PSUBSCRIBE" : mode === "sharded" ? "SSUBSCRIBE" : "SUBSCRIBE"
    const target = typeof channel === "string" ? channel : channel.slice()
    const topology = client.config.topology

    const scope = yield* Scope.fork(yield* Effect.scope)
    const close = Scope.close(scope, Exit.void)
    const messages = yield* Queue.bounded<Message, RedisError>(capacity)
    yield* Scope.addFinalizer(scope, Queue.shutdown(messages))
    let overflowed = false

    const onPush = (restart: Deferred.Deferred<void>) => (reply: Protocol.Reply) => {
      while (reply._tag === "Attribute") reply = reply.value
      if (reply._tag !== "Push" && reply._tag !== "Array") return
      const kind = decoder.decode(bytesOf(reply.values[0]))
      if (mode === "sharded" && kind === "sunsubscribe") {
        Deferred.doneUnsafe(restart, Effect.void)
        return
      }
      const isPattern = kind === "pmessage"
      if (kind !== "message" && kind !== "smessage" && !isPattern) return
      const offset = isPattern ? 1 : 0
      const destination = bytesOf(reply.values[offset + 1])
      const message = bytesOf(reply.values[offset + 2])
      if (destination === undefined || message === undefined) return
      const pattern = isPattern ? bytesOf(reply.values[1]) : undefined
      if (!Queue.offerUnsafe(messages, { channel: destination, message, pattern }) && !overflowed) {
        overflowed = true
        Queue.failCauseUnsafe(
          messages,
          Cause.fail(new RedisError({ reason: "Capacity", message: "Redis subscription message capacity exceeded" }))
        )
        Deferred.doneUnsafe(restart, Effect.void)
      }
    }

    const subscribeAt = (node: Endpoint | undefined, asking: boolean): Effect.Effect<Generation, RedisError> =>
      Effect.gen(function*() {
        const generationScope = yield* Scope.fork(scope)
        const restart = Deferred.makeUnsafe<void>()
        const affinity = node !== undefined ? { node } : mode === "sharded" ? { key: target } : {}
        return yield* Effect.gen(function*() {
          const connection = yield* client.reserve(affinity)
          const remove = connection.onPush(onPush(restart))
          yield* Scope.addFinalizer(generationScope, Effect.sync(remove))
          if (asking) yield* connection.execute(["ASKING"])
          yield* connection.execute([command, target])
          return { scope: generationScope, connection, restart }
        }).pipe(
          Scope.provide(generationScope),
          Effect.onError(() => Scope.close(generationScope, Exit.void))
        )
      })

    // Sharded channels live on the slot owner, so follow Cluster redirects.
    const subscribe = Effect.gen(function*() {
      const maxRedirects = topology?._tag === "Cluster" ? topology.maxRedirects ?? 5 : 0
      let node: Endpoint | undefined
      let asking = false
      for (let redirects = 0;; redirects++) {
        const result = yield* Effect.result(subscribeAt(node, asking))
        if (result._tag === "Success") return result.success
        const error = result.failure
        const match = redirectPattern.exec(error.message)
        if (mode !== "sharded" || topology?._tag !== "Cluster" || error.reason !== "Server" || match === null) {
          return yield* Effect.fail(error)
        }
        if (redirects >= maxRedirects) {
          return yield* Effect.fail(
            new RedisError({
              reason: "Routing",
              message: "Redis subscription redirect limit exceeded",
              cause: error,
              code: error.code
            })
          )
        }
        const redirected = {
          host: match[2].replace(/^\[(.*)\]$/, "$1"),
          port: Number(match[3]),
          tls: topology.seeds[0]?.tls
        }
        node = topology.mapAddress === undefined ? redirected : topology.mapAddress(redirected)
        asking = match[1] === "ASK"
        yield* Effect.ignore(client.refresh)
      }
    })

    let generation = yield* subscribe.pipe(Effect.onError(() => close))

    const reconnect = Effect.gen(function*() {
      while (true) {
        yield* Effect.sleep(client.config.reconnectDelay ?? "100 millis")
        yield* Effect.ignore(client.refresh)
        const result = yield* Effect.result(subscribe)
        if (result._tag === "Success") return result.success
      }
    })

    const listen = Effect.gen(function*() {
      while (true) {
        yield* Effect.exit(Effect.raceFirst(generation.connection.closed, Deferred.await(generation.restart)))
        yield* Scope.close(generation.scope, Exit.void)
        if (overflowed) return
        generation = yield* reconnect
      }
    })

    const onClientClosed = client.closed.pipe(
      Effect.andThen(Queue.fail(messages, notSent("Closed", "Redis client scope closed"))),
      Effect.andThen(Effect.suspend(() => Scope.close(generation.scope, Exit.void)))
    )

    yield* Effect.raceFirst(listen, onClientClosed).pipe(Effect.forkIn(scope))
    return { messages: Queue.asDequeue(messages), close } satisfies RedisSubscription
  }
)

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
  readonly capacity?: number | undefined
}

/**
 * Acknowledged subscription whose messages terminate when its scope closes.
 *
 * **Gotchas**
 *
 * Redis Pub/Sub does not recover publications missed while reconnecting.
 * Exceeding the bounded capacity fails the subscription rather than silently
 * dropping messages. One subscription owns one dedicated connection.
 * Closing the client fails subscriptions with a `Closed` error.
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
const binary = (reply: Protocol.Reply | undefined): Uint8Array | undefined =>
  reply?._tag === "BlobString" ? reply.value : reply?._tag === "SimpleString" ? encoder.encode(reply.value) : undefined

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
      return yield* Effect.fail(
        new RedisError({
          reason: "Capacity",
          message: "Subscription capacity must be a positive integer",
          outcome: "NotSent"
        })
      )
    }
    const parent = yield* Effect.scope
    const scope = yield* Scope.fork(parent)
    const messages = yield* Queue.bounded<Message, RedisError>(capacity)
    const overflow = yield* Deferred.make<never, RedisError>()
    const mode = options.mode ?? "channel"
    const target = typeof channel === "string" ? channel : Uint8Array.from(channel)
    const command = mode === "pattern" ? "PSUBSCRIBE" : mode === "sharded" ? "SSUBSCRIBE" : "SUBSCRIBE"
    let activeScope: Scope.Closeable | undefined
    let overflowing = false
    const close = Scope.close(scope, Exit.void)
    yield* Scope.addFinalizer(scope, Queue.shutdown(messages))

    let lastEndpoint: Endpoint | undefined
    const connectOnce = (node?: Endpoint, asking = false) =>
      Effect.gen(function*() {
        const child = yield* Scope.fork(scope)
        activeScope = child
        const restart = yield* Deferred.make<void>()
        const connection = yield* client.reserve(
          node !== undefined ? { node } : mode === "sharded" ? { key: target } : {}
        ).pipe(
          Effect.provideService(Scope.Scope, child),
          Effect.onError(() => Scope.close(child, Exit.void))
        )
        lastEndpoint = connection.endpoint
        const remove = connection.onPush((reply) => {
          while (reply._tag === "Attribute") reply = reply.value
          if (reply._tag !== "Push" && reply._tag !== "Array") return
          const kindBytes = binary(reply.values[0])
          const kind = kindBytes === undefined ? "" : decoder.decode(kindBytes)
          // Redis removes sharded subscriptions when their slot changes owner,
          // without closing the physical connection. Re-resolve that generation.
          if (mode === "sharded" && kind === "sunsubscribe") {
            Deferred.doneUnsafe(restart, Effect.void)
            return
          }
          const isPattern = kind === "pmessage"
          if (kind !== "message" && kind !== "smessage" && !isPattern) return
          const destination = binary(reply.values[isPattern ? 2 : 1])
          const payload = binary(reply.values[isPattern ? 3 : 2])
          const pattern = isPattern ? binary(reply.values[1]) : undefined
          if (destination === undefined || payload === undefined) return
          if (!Queue.offerUnsafe(messages, { channel: destination, message: payload, pattern }) && !overflowing) {
            overflowing = true
            const error = new RedisError({
              reason: "Capacity",
              message: "Redis subscription message capacity exceeded"
            })
            Queue.failCauseUnsafe(messages, Cause.fail(error))
            Deferred.doneUnsafe(overflow, Effect.fail(error))
          }
        })
        yield* Scope.addFinalizer(child, Effect.sync(remove))
        yield* (asking ? connection.execute(["ASKING"]).pipe(Effect.asVoid) : Effect.void).pipe(
          Effect.andThen(connection.execute([command, target])),
          Effect.onError(() => Scope.close(child, Exit.void))
        )
        return { connection, restart }
      })
    const connect = Effect.gen(function*() {
      const topology = client.config.topology
      const limit = topology?._tag === "Cluster" ? topology.maxRedirects ?? 5 : 0
      let node: Endpoint | undefined
      let asking = false
      for (let redirects = 0;; redirects++) {
        const result = yield* Effect.result(connectOnce(node, asking))
        if (result._tag === "Success") return result.success
        const error = result.failure
        if (mode !== "sharded" || topology?._tag !== "Cluster" || (error.code !== "MOVED" && error.code !== "ASK")) {
          return yield* Effect.fail(error)
        }
        if (redirects >= limit) {
          return yield* Effect.fail(
            new RedisError({
              reason: "Routing",
              message: "Redis subscription redirect limit exceeded",
              cause: error,
              code: error.code
            })
          )
        }
        const match = /^(MOVED|ASK) (\d+) (.*):(\d+)$/.exec(error.message)
        const port = match === null ? NaN : Number(match[4])
        const slot = match === null ? NaN : Number(match[2])
        if (match === null || port < 1 || port > 65535 || slot < 0 || slot > 16383) return yield* Effect.fail(error)
        const host = match[3].replace(/^\[|\]$/g, "") || lastEndpoint!.host
        node = { host, port, tls: lastEndpoint?.tls }
        if (topology.mapAddress !== undefined) {
          const redirected = node
          node = yield* Effect.try({
            try: () => topology.mapAddress!(redirected),
            catch: (cause) =>
              new RedisError({
                reason: "Routing",
                message: "Redis subscription address mapping failed",
                cause,
                outcome: "NotSent"
              })
          })
        }
        asking = match[1] === "ASK"
        yield* Effect.ignoreCause(client.refresh)
      }
    })
    let generation: { readonly connection: RedisConnection; readonly restart: Deferred.Deferred<void> } = yield* connect
      .pipe(Effect.onError(() => close))
    const listen = Effect.gen(function*() {
      while (true) {
        yield* Effect.result(Effect.raceFirst(
          Effect.raceFirst(generation.connection.closed, Deferred.await(generation.restart)),
          Deferred.await(overflow)
        ))
        if (activeScope !== undefined) yield* Scope.close(activeScope, Exit.void)
        if (overflowing) return
        let connected = false
        while (!connected) {
          yield* Effect.sleep(client.config.reconnectDelay ?? "100 millis")
          yield* Effect.ignoreCause(client.refresh)
          const result = yield* Effect.result(connect)
          if (result._tag === "Success") {
            generation = result.success
            connected = true
          }
        }
      }
    })
    const clientClosed = client.closed.pipe(
      Effect.andThen(Effect.sync(() => {
        Queue.failCauseUnsafe(
          messages,
          Cause.fail(
            new RedisError({
              reason: "Closed",
              message: "Redis client scope closed",
              outcome: "NotSent"
            })
          )
        )
      })),
      Effect.andThen(
        Effect.suspend(() => activeScope === undefined ? Effect.void : Scope.close(activeScope, Exit.void))
      )
    )
    const guardedListen = listen.pipe(Effect.onError((cause) =>
      Cause.hasInterruptsOnly(cause)
        ? Effect.void
        : Queue.failCause(messages, cause).pipe(
          Effect.andThen(
            Effect.suspend(() => activeScope === undefined ? Effect.void : Scope.close(activeScope, Exit.void))
          )
        )
    ))
    yield* Effect.forkScoped(
      Effect.raceFirst(guardedListen, clientClosed).pipe(Effect.provideService(Scope.Scope, scope))
    )
      .pipe(
        Effect.provideService(Scope.Scope, scope)
      )
    return { messages: Queue.asDequeue(messages), close } satisfies RedisSubscription
  }
)

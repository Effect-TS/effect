import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import { Chunk, Deferred, Effect, Equal, Exit, Fiber, Number, pipe, Random, Stream, SubscriptionRef } from "effect"

describe("SubscriptionRef", () => {
  it.effect("multiple subscribers can receive changes", () =>
    Effect.gen(function*() {
      const subscriptionRef = yield* (SubscriptionRef.make(0))
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const subscriber1 = yield* pipe(
        subscriptionRef.changes,
        Stream.tap(() => Deferred.succeed(deferred1, void 0)),
        Stream.take(3),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(deferred1))
      yield* (SubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const subscriber2 = yield* pipe(
        subscriptionRef.changes,
        Stream.tap(() => Deferred.succeed(deferred2, void 0)),
        Stream.take(2),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(deferred2))
      yield* (SubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const result1 = yield* (Fiber.join(subscriber1))
      const result2 = yield* (Fiber.join(subscriber2))
      deepStrictEqual(Array.from(result1), [0, 1, 2])
      deepStrictEqual(Array.from(result2), [1, 2])
    }))

  it.effect("subscriptions are interruptible", () =>
    Effect.gen(function*() {
      const subscriptionRef = yield* (SubscriptionRef.make(0))
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const subscriber1 = yield* pipe(
        subscriptionRef.changes,
        Stream.tap(() => Deferred.succeed(deferred1, void 0)),
        Stream.take(5),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(deferred1))
      yield* (SubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const subscriber2 = yield* pipe(
        subscriptionRef.changes,
        Stream.tap(() => Deferred.succeed(deferred2, void 0)),
        Stream.take(2),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(deferred2))
      yield* (SubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const result1 = yield* (Fiber.interrupt(subscriber1))
      const result2 = yield* (Fiber.join(subscriber2))
      assertTrue(Exit.isInterrupted(result1))
      deepStrictEqual(Array.from(result2), [1, 2])
    }))

  it.effect("concurrent subscribes and unsubscribes are handled correctly", () =>
    Effect.gen(function*() {
      const subscriber = (subscriptionRef: SubscriptionRef.SubscriptionRef<number>) =>
        pipe(
          Random.nextIntBetween(0, 200),
          Effect.flatMap((n) =>
            pipe(
              subscriptionRef.changes,
              Stream.take(n),
              Stream.runCollect
            )
          )
        )
      const subscriptionRef = yield* (SubscriptionRef.make(0))
      const fiber = yield* pipe(
        SubscriptionRef.update(subscriptionRef, (n) => n + 1),
        Effect.forever,
        Effect.fork
      )
      const result = yield* (
        Effect.map(
          Effect.all(
            Array.from({ length: 2 }, () => subscriber(subscriptionRef)),
            { concurrency: 2 }
          ),
          Chunk.unsafeFromArray
        )
      )
      yield* (Fiber.interrupt(fiber))
      const isSorted = Chunk.every(result, (chunk) => Equal.equals(chunk, Chunk.sort(chunk, Number.Order)))
      assertTrue(isSorted)
    }))
})

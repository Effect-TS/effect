import * as it from "effect-test/utils/extend"
import { Chunk } from "effect/Chunk"
import { Deferred } from "effect/Deferred"
import { Effect } from "effect/Effect"
import { Equal } from "effect/Equal"
import { Exit } from "effect/Exit"
import { Fiber } from "effect/Fiber"
import { pipe } from "effect/Function"
import { Number } from "effect/Number"
import { Random } from "effect/Random"
import { Stream } from "effect/Stream"
import { SubscriptionRef } from "effect/SubscriptionRef"
import { assert, describe } from "vitest"

describe.concurrent("SubscriptionRef", () => {
  it.effect("multiple subscribers can receive changes", () =>
    Effect.gen(function*($) {
      const subscriptionRef = yield* $(SubscriptionRef.make(0))
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const subscriber1 = yield* $(
        subscriptionRef.changes,
        Stream.tap(() => Deferred.succeed<never, void>(deferred1, void 0)),
        Stream.take(3),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(Deferred.await(deferred1))
      yield* $(SubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const subscriber2 = yield* $(
        subscriptionRef.changes,
        Stream.tap(() => Deferred.succeed<never, void>(deferred2, void 0)),
        Stream.take(2),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(Deferred.await(deferred2))
      yield* $(SubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const result1 = yield* $(Fiber.join(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      assert.deepStrictEqual(Array.from(result1), [0, 1, 2])
      assert.deepStrictEqual(Array.from(result2), [1, 2])
    }))

  it.effect("subscriptions are interruptible", () =>
    Effect.gen(function*($) {
      const subscriptionRef = yield* $(SubscriptionRef.make(0))
      const deferred1 = yield* $(Deferred.make<never, void>())
      const deferred2 = yield* $(Deferred.make<never, void>())
      const subscriber1 = yield* $(
        subscriptionRef.changes,
        Stream.tap(() => Deferred.succeed<never, void>(deferred1, void 0)),
        Stream.take(5),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(Deferred.await(deferred1))
      yield* $(SubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const subscriber2 = yield* $(
        subscriptionRef.changes,
        Stream.tap(() => Deferred.succeed<never, void>(deferred2, void 0)),
        Stream.take(2),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(Deferred.await(deferred2))
      yield* $(SubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const result1 = yield* $(Fiber.interrupt(subscriber1))
      const result2 = yield* $(Fiber.join(subscriber2))
      assert.isTrue(Exit.isInterrupted(result1))
      assert.deepStrictEqual(Array.from(result2), [1, 2])
    }))

  it.effect("concurrent subscribes and unsubscribes are handled correctly", () =>
    Effect.gen(function*($) {
      const subscriber = (subscriptionRef: SubscriptionRef<number>) =>
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
      const subscriptionRef = yield* $(SubscriptionRef.make(0))
      const fiber = yield* $(
        SubscriptionRef.update(subscriptionRef, (n) => n + 1),
        Effect.forever,
        Effect.fork
      )
      const result = yield* $(
        Effect.map(
          Effect.all(
            Array.from({ length: 2 }, () => subscriber(subscriptionRef)),
            { concurrency: 2 }
          ),
          Chunk.unsafeFromArray
        )
      )
      yield* $(Fiber.interrupt(fiber))
      const isSorted = Chunk.every(result, (chunk) => Equal.equals(chunk, Chunk.sort(chunk, Number.Order)))
      assert.isTrue(isSorted)
    }))
})

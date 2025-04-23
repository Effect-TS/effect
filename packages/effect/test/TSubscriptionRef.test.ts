import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import {
  Chunk,
  Deferred,
  Effect,
  Equal,
  Exit,
  Fiber,
  Number,
  pipe,
  Random,
  STM,
  Stream,
  TSubscriptionRef
} from "effect"

describe.concurrent("TSubscriptionRef", () => {
  it.effect("only emits comitted values", () =>
    Effect.gen(function*() {
      const subscriptionRef = yield* (TSubscriptionRef.make(0))

      const transaction = pipe(
        TSubscriptionRef.update(subscriptionRef, (n) => n + 1),
        STM.tap(() => TSubscriptionRef.update(subscriptionRef, (n) => n + 1))
      )

      const subscriber = yield* (pipe(
        TSubscriptionRef.changesStream(subscriptionRef),
        Stream.take(1),
        Stream.runCollect,
        Effect.fork
      ))
      // stream doesn't work properly without a yield, it will drop values
      yield* (Effect.yieldNow())
      yield* (STM.commit(transaction))
      yield* (Effect.yieldNow())
      const result = yield* (Fiber.join(subscriber))

      deepStrictEqual(Array.from(result), [2])
    }))

  it.effect("emits every comitted value", () =>
    Effect.gen(function*() {
      const subscriptionRef = yield* (TSubscriptionRef.make(0))

      const transaction = pipe(
        TSubscriptionRef.update(subscriptionRef, (n) => n + 1),
        STM.commit,
        // stream doesn't work properly without a yield, it will drop the first value without this
        Effect.tap(() => Effect.yieldNow()),
        Effect.flatMap(() => TSubscriptionRef.update(subscriptionRef, (n) => n + 1))
      )

      const subscriber = yield* (pipe(
        TSubscriptionRef.changesStream(subscriptionRef),
        Stream.take(2),
        Stream.runCollect,
        Effect.fork
      ))
      // stream doesn't work properly without a yield, it will drop the first value without this
      yield* (Effect.yieldNow())
      yield* transaction
      const result = yield* (Fiber.join(subscriber))

      deepStrictEqual(Array.from(result), [1, 2])
    }))

  it.effect("multiple subscribers can receive committed values", () =>
    Effect.gen(function*() {
      const subscriptionRef = yield* (TSubscriptionRef.make(0))
      const deferred1 = yield* (Deferred.make<void, never>())
      const deferred2 = yield* (Deferred.make<void, never>())
      const subscriber1 = yield* (pipe(
        TSubscriptionRef.changesStream(subscriptionRef),
        Stream.tap(() => Deferred.succeed<void, never>(deferred1, void 0)),
        Stream.take(3),
        Stream.runCollect,
        Effect.fork
      ))
      yield* (Deferred.await(deferred1))
      yield* (TSubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const subscriber2 = yield* (pipe(
        TSubscriptionRef.changesStream(subscriptionRef),
        Stream.tap(() => Deferred.succeed<void, never>(deferred2, void 0)),
        Stream.take(2),
        Stream.runCollect,
        Effect.fork
      ))
      yield* (Deferred.await(deferred2))
      yield* (TSubscriptionRef.update(subscriptionRef, (n) => n + 1))
      const result1 = yield* (Fiber.join(subscriber1))
      const result2 = yield* (Fiber.join(subscriber2))
      deepStrictEqual(Array.from(result1), [0, 1, 2])
      deepStrictEqual(Array.from(result2), [1, 2])
    }))

  it.effect("subscriptions are interruptible", () =>
    Effect.gen(function*() {
      const ref = yield* (TSubscriptionRef.make(0))
      const deferred1 = yield* (Deferred.make<void>())
      const deferred2 = yield* (Deferred.make<void>())
      const subscriber1 = yield* pipe(
        TSubscriptionRef.changesStream(ref),
        Stream.tap(() => Deferred.succeed(deferred1, void 0)),
        Stream.take(5),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(deferred1))
      yield* (TSubscriptionRef.update(ref, (n) => n + 1))
      const subscriber2 = yield* pipe(
        TSubscriptionRef.changesStream(ref),
        Stream.tap(() => Deferred.succeed(deferred2, void 0)),
        Stream.take(2),
        Stream.runCollect,
        Effect.fork
      )
      yield* (Deferred.await(deferred2))
      yield* (TSubscriptionRef.update(ref, (n) => n + 1))
      const result1 = yield* (Fiber.interrupt(subscriber1))
      const result2 = yield* (Fiber.join(subscriber2))
      assertTrue(Exit.isInterrupted(result1))
      deepStrictEqual(Array.from(result2), [1, 2])
    }))

  it.effect("concurrent subscribes and unsubscribes are handled correctly", () =>
    Effect.gen(function*() {
      const subscriber = (subscriptionRef: TSubscriptionRef.TSubscriptionRef<number>) =>
        pipe(
          Random.nextIntBetween(0, 200),
          Effect.flatMap((n) =>
            pipe(
              TSubscriptionRef.changesStream(subscriptionRef),
              Stream.take(n),
              Stream.runCollect
            )
          )
        )
      const ref = yield* (TSubscriptionRef.make(0))
      const fiber = yield* pipe(
        TSubscriptionRef.update(ref, (n) => n + 1),
        Effect.forever,
        Effect.fork
      )
      const result = yield* (
        Effect.map(
          Effect.all(
            Array.from({ length: 2 }, () => subscriber(ref)),
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

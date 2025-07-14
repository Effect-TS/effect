import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertLeft,
  assertNone,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from "@effect/vitest/utils"
import { Array, Cause, Chunk, Deferred, Effect, Exit, Fiber, identity, pipe, Queue, Ref } from "effect"

export const waitForValue = <A>(ref: Effect.Effect<A>, value: A): Effect.Effect<A> => {
  return ref.pipe(Effect.zipLeft(Effect.yieldNow()), Effect.repeat({ until: (a) => value === a }))
}

export const waitForSize = <A>(queue: Queue.Queue<A>, size: number): Effect.Effect<number> => {
  return waitForValue(Queue.size(queue), size)
}

describe("Queue", () => {
  it.effect("bounded - offerAll returns true when there is enough space", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      const result = yield* Queue.offerAll(queue, [1, 2, 3])
      assertTrue(result)
    }))
  it.effect("dropping - with offerAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.dropping<number>(4)
      const result1 = yield* Queue.offerAll(queue, [1, 2, 3, 4, 5])
      const result2 = yield* Queue.takeAll(queue)
      assertFalse(result1)
      deepStrictEqual(Chunk.toReadonlyArray(result2), [1, 2, 3, 4])
    }))
  it.effect("dropping - with offerAll, check offer returns false", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.dropping<number>(2)
      const result1 = yield* Queue.offerAll(queue, [1, 2, 3, 4, 5, 6])
      const result2 = yield* Queue.takeAll(queue)
      assertFalse(result1)
      deepStrictEqual(Chunk.toReadonlyArray(result2), [1, 2])
    }))
  it.effect("dropping - with offerAll, check ordering", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.dropping<number>(128)
      const result1 = yield* Queue.offerAll(queue, Array.makeBy(256, (i) => i + 1))
      const result2 = yield* Queue.takeAll(queue)
      assertFalse(result1)
      deepStrictEqual(Chunk.toReadonlyArray(result2), Array.makeBy(128, (i) => i + 1))
    }))
  it.effect("dropping - with pending taker", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.dropping<number>(2)
      const fiber = yield* Effect.fork(Queue.take(queue))
      yield* waitForSize(queue, -1)
      const result1 = yield* Queue.offerAll(queue, [1, 2, 3, 4])
      const result2 = yield* Fiber.join(fiber)
      assertFalse(result1)
      strictEqual(result2, 1)
    }))
  it.effect("sliding - with offer", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(2)
      yield* Queue.offer(queue, 1)
      const result1 = yield* Queue.offer(queue, 2)
      const result2 = yield* Queue.offer(queue, 3)
      const result3 = yield* Queue.takeAll(queue)
      assertTrue(result1)
      assertTrue(result2)
      deepStrictEqual(Chunk.toReadonlyArray(result3), [2, 3])
    }))
  it.effect("sliding - with offerAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(2)
      const result1 = yield* Queue.offerAll(queue, [1, 2, 3])
      const result2 = yield* Queue.size(queue)
      assertTrue(result1)
      strictEqual(result2, 2)
    }))
  it.effect("sliding - with enough capacity", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      const result = yield* Queue.takeAll(queue)
      deepStrictEqual(Chunk.toReadonlyArray(result), [1, 2, 3])
    }))
  it.effect("sliding - with offerAll and takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(2)
      const result1 = yield* Queue.offerAll(queue, [1, 2, 3, 4, 5, 6])
      const result2 = yield* Queue.takeAll(queue)
      assertTrue(result1)
      deepStrictEqual(Chunk.toReadonlyArray(result2), [5, 6])
    }))
  it.effect("sliding - with pending taker", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(2)
      yield* Effect.fork(Queue.take(queue))
      yield* waitForSize(queue, -1)
      const result1 = yield* Queue.offerAll(queue, [1, 2, 3, 4])
      const result2 = yield* Queue.take(queue)
      assertTrue(result1)
      strictEqual(result2, 3)
    }))
  it.effect("sliding - check offerAll returns true", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.sliding<number>(5)
      const result = yield* Queue.offerAll(queue, [1, 2, 3])
      assertTrue(result)
    }))
  it.effect("awaitShutdown - once", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(3)
      const deferred = yield* Deferred.make<boolean>()
      yield* pipe(Queue.awaitShutdown(queue), Effect.zipRight(Deferred.succeed(deferred, true)), Effect.fork)
      yield* Queue.shutdown(queue)
      const result = yield* Deferred.await(deferred)
      assertTrue(result)
    }))
  it.effect("awaitShutdown - multiple", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(3)
      const deferred1 = yield* Deferred.make<boolean>()
      const deferred2 = yield* Deferred.make<boolean>()
      yield* pipe(Queue.awaitShutdown(queue), Effect.zipRight(Deferred.succeed(deferred1, true)), Effect.fork)
      yield* pipe(Queue.awaitShutdown(queue), Effect.zipRight(Deferred.succeed(deferred2, true)), Effect.fork)
      yield* Queue.shutdown(queue)
      const result1 = yield* Deferred.await(deferred1)
      const result2 = yield* Deferred.await(deferred2)
      assertTrue(result1)
      assertTrue(result2)
    }))
  it.effect("offers are suspended by back pressure", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(10)
      const ref = yield* Ref.make(true)
      yield* pipe(queue.offer(1), Effect.repeatN(9))
      const fiber = yield* pipe(Queue.offer(queue, 2), Effect.zipRight(Ref.set(ref, false)), Effect.fork)
      yield* waitForSize(queue, 11)
      const result = yield* Ref.get(ref)
      yield* Fiber.interrupt(fiber)
      assertTrue(result)
    }))
  it.effect("back pressured offers are retrieved", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(10)
      const ref = yield* Ref.make<ReadonlyArray<number>>([])
      const values = Array.makeBy(10, (i) => i + 1)
      const fiber = yield* Effect.forkAll(values.map((n) => Queue.offer(queue, n)))
      yield* waitForSize(queue, 10)
      yield* pipe(
        Queue.take(queue),
        Effect.flatMap((n) => Ref.update(ref, (values) => [...values, n])),
        Effect.repeatN(9)
      )
      const result = yield* Ref.get(ref)
      yield* Fiber.join(fiber)
      deepStrictEqual(result, values)
    }))
  it.effect("back-pressured offer completes after take", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* Queue.offerAll(queue, [1, 2])
      const fiber = yield* pipe(Queue.offer(queue, 3), Effect.fork)
      yield* waitForSize(queue, 3)
      const result1 = yield* Queue.take(queue)
      const result2 = yield* Queue.take(queue)
      yield* Fiber.join(fiber)
      strictEqual(result1, 1)
      strictEqual(result2, 2)
    }))
  it.effect("back-pressured offer completes after takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* Queue.offerAll(queue, [1, 2])
      const fiber = yield* pipe(Queue.offer(queue, 3), Effect.fork)
      yield* waitForSize(queue, 3)
      const result = yield* Queue.takeAll(queue)
      yield* Fiber.join(fiber)
      deepStrictEqual(Chunk.toReadonlyArray(result), [1, 2])
    }))
  it.effect("back-pressured offer completes after takeUpTo", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* Queue.offerAll(queue, [1, 2])
      const fiber = yield* pipe(Queue.offer(queue, 3), Effect.fork)
      yield* waitForSize(queue, 3)
      const result = yield* Queue.takeUpTo(queue, 2)
      yield* Fiber.join(fiber)
      deepStrictEqual(Chunk.toReadonlyArray(result), [1, 2])
    }))
  it.effect("back-pressured offerAll completes after takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* Queue.offerAll(queue, [1, 2])
      const fiber = yield* pipe(Queue.offerAll(queue, [3, 4, 5]), Effect.fork)
      yield* waitForSize(queue, 5)
      const result1 = yield* Queue.takeAll(queue)
      const result2 = yield* Queue.takeAll(queue)
      const result3 = yield* Queue.takeAll(queue)
      yield* Fiber.join(fiber)
      deepStrictEqual(Chunk.toReadonlyArray(result1), [1, 2])
      deepStrictEqual(Chunk.toReadonlyArray(result2), [3, 4])
      deepStrictEqual(Chunk.toReadonlyArray(result3), [5])
    }))
  it.effect("take interruption", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const fiber = yield* Effect.fork(Queue.take(queue))
      yield* waitForSize(queue, -1)
      yield* Fiber.interrupt(fiber)
      const result = yield* Queue.size(queue)
      strictEqual(result, 0)
    }))
  it.effect("offer interruption", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 1)
      const fiber = yield* pipe(Queue.offer(queue, 1), Effect.fork)
      yield* waitForSize(queue, 3)
      yield* Fiber.interrupt(fiber)
      const result = yield* Queue.size(queue)
      strictEqual(result, 2)
    }))
  it.effect("offerAll with takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(10)
      const values = Array.range(1, 10)
      yield* Queue.offerAll(queue, values)
      yield* waitForSize(queue, 10)
      const result = yield* Queue.takeAll(queue)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 10))
    }))
  it.effect("offerAll with takeAll and back pressure", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      const values = Array.range(1, 3)
      const fiber = yield* pipe(Queue.offerAll(queue, values), Effect.fork)
      const size = yield* waitForSize(queue, 3)
      const result = yield* Queue.takeAll(queue)
      yield* Fiber.interrupt(fiber)
      strictEqual(size, 3)
      deepStrictEqual(Chunk.toReadonlyArray(result), [1, 2])
    }))
  it.effect("offerAll with takeAll and back pressure + interruption", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      const values1 = Array.range(1, 2)
      const values2 = Array.range(3, 4)
      yield* Queue.offerAll(queue, values1)
      const fiber = yield* pipe(Queue.offerAll(queue, values2), Effect.fork)
      yield* waitForSize(queue, 4)
      yield* Fiber.interrupt(fiber)
      const result1 = yield* Queue.takeAll(queue)
      const result2 = yield* Queue.takeAll(queue)
      deepStrictEqual(Chunk.toReadonlyArray(result1), values1)
      assertTrue(Chunk.isEmpty(result2))
    }))
  it.effect("offerAll with takeAll and back pressure, check ordering", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(64)
      const fiber = yield* pipe(Queue.offerAll(queue, Array.makeBy(128, (i) => i + 1)), Effect.fork)
      yield* waitForSize(queue, 128)
      const result = yield* Queue.takeAll(queue)
      yield* Fiber.interrupt(fiber)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 64))
    }))
  it.effect("offerAll with pending takers", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(50)
      const takers = yield* Effect.forkAll(Array.makeBy(100, () => Queue.take(queue)))
      yield* waitForSize(queue, -100)
      yield* queue.offerAll(Array.makeBy(100, (i) => i + 1))
      const result = yield* Fiber.join(takers)
      const size = yield* Queue.size(queue)
      strictEqual(size, 0)
      deepStrictEqual(result, Array.range(1, 100))
    }))
  it.effect("offerAll with pending takers, check ordering", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(256)
      const takers = yield* Effect.forkAll(Array.makeBy(64, () => Queue.take(queue)))
      yield* waitForSize(queue, -64)
      yield* Queue.offerAll(queue, Array.makeBy(128, (i) => i + 1))
      const result = yield* Fiber.join(takers)
      const size = yield* Queue.size(queue)
      strictEqual(size, 64)
      deepStrictEqual(result, Array.range(1, 64))
    }))
  it.effect("offerAll with pending takers, check ordering of taker resolution", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(200)
      const takers = yield* Effect.forkAll(Array.makeBy(100, () => Queue.take(queue)))
      yield* waitForSize(queue, -100)
      const fiber = yield* Effect.forkAll(Array.makeBy(100, () => Queue.take(queue)))
      yield* waitForSize(queue, -200)
      yield* Queue.offerAll(queue, Array.makeBy(100, (i) => i + 1))
      const result = yield* Fiber.join(takers)
      const size = yield* Queue.size(queue)
      yield* Fiber.interrupt(fiber)
      strictEqual(size, -100)
      deepStrictEqual(result, Array.range(1, 100))
    }))
  it.effect("offerAll with take and back pressure", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(Queue.offerAll(queue, [1, 2, 3]), Effect.fork)
      yield* waitForSize(queue, 3)
      const result1 = yield* Queue.take(queue)
      const result2 = yield* Queue.take(queue)
      const result3 = yield* Queue.take(queue)
      strictEqual(result1, 1)
      strictEqual(result2, 2)
      strictEqual(result3, 3)
    }))
  it.effect("offerAll multiple with back pressure", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* pipe(Queue.offerAll(queue, [1, 2, 3]), Effect.fork)
      yield* waitForSize(queue, 3)
      yield* pipe(Queue.offerAll(queue, [4, 5]), Effect.fork)
      yield* waitForSize(queue, 5)
      const result1 = yield* Queue.take(queue)
      const result2 = yield* Queue.take(queue)
      const result3 = yield* Queue.take(queue)
      const result4 = yield* Queue.take(queue)
      const result5 = yield* Queue.take(queue)
      strictEqual(result1, 1)
      strictEqual(result2, 2)
      strictEqual(result3, 3)
      strictEqual(result4, 4)
      strictEqual(result5, 5)
    }))
  it.effect("offerAll with takeAll, check ordering", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(1000)
      yield* Queue.offer(queue, 1)
      yield* Queue.offerAll(queue, Array.range(2, 1000))
      yield* waitForSize(queue, 1000)
      const result = yield* Queue.takeAll(queue)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 1000))
    }))
  it.effect("offerAll combination of offer, offerAll, take, takeAll", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(32)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* pipe(Queue.offerAll(queue, Array.range(3, 35)), Effect.fork)
      yield* waitForSize(queue, 35)
      const result1 = yield* Queue.takeAll(queue)
      const result2 = yield* Queue.take(queue)
      const result3 = yield* Queue.take(queue)
      const result4 = yield* Queue.take(queue)
      deepStrictEqual(Chunk.toReadonlyArray(result1), Array.range(1, 32))
      strictEqual(result2, 33)
      strictEqual(result3, 34)
      strictEqual(result4, 35)
    }))
  it.effect("parallel takes and sequential offers", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const fiber = yield* Effect.forkAll(Array.makeBy(10, () => Queue.take(queue)))
      yield* Array.makeBy(10, (i) => Queue.offer(queue, i + 1))
        .reduce((acc, curr) => pipe(acc, Effect.zipRight(curr)), Effect.succeed(false))
      const result = yield* Fiber.join(fiber)
      deepStrictEqual(result, Array.range(1, 10))
    }))
  it.effect("parallel offers and sequential takes", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(10)
      const fiber = yield* Effect.forkAll(Array.makeBy(10, (i) => Queue.offer(queue, i + 1)))
      yield* waitForSize(queue, 10)
      const ref = yield* Ref.make<ReadonlyArray<number>>([])
      yield* pipe(
        Queue.take(queue),
        Effect.flatMap((n) => Ref.update(ref, (ns) => [...ns, n])),
        Effect.repeatN(9)
      )
      const result = yield* Ref.get(ref)
      yield* Fiber.join(fiber)
      deepStrictEqual(result, Array.makeBy(10, (i) => i + 1))
    }))
  it.effect("sequential offer and take", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const offer1 = yield* Queue.offer(queue, 10)
      const result1 = yield* Queue.take(queue)
      const offer2 = yield* Queue.offer(queue, 20)
      const result2 = yield* Queue.take(queue)
      assertTrue(offer1)
      strictEqual(result1, 10)
      assertTrue(offer2)
      strictEqual(result2, 20)
    }))
  it.effect("sequential take and offer", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<string>(100)
      const fiber = yield* pipe(Queue.take(queue), Effect.zipWith(Queue.take(queue), (a, b) => a + b), Effect.fork)
      yield* pipe(Queue.offer(queue, "don't "), Effect.zipRight(Queue.offer(queue, "give up :D")))
      const result = yield* Fiber.join(fiber)
      strictEqual(result, "don't give up :D")
    }))
  it.effect("poll on empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      const result = yield* Queue.poll(queue)
      assertNone(result)
    }))
  it.effect("poll on queue just emptied", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      yield* Queue.offerAll(queue, [1, 2, 3, 4])
      yield* Queue.takeAll(queue)
      const result = yield* Queue.poll(queue)
      assertNone(result)
    }))
  it.effect("multiple polls", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      yield* Queue.offerAll(queue, [1, 2])
      const result1 = yield* Queue.poll(queue)
      const result2 = yield* Queue.poll(queue)
      const result3 = yield* Queue.poll(queue)
      const result4 = yield* Queue.poll(queue)
      assertSome(result1, 1)
      assertSome(result2, 2)
      assertNone(result3)
      assertNone(result4)
    }))
  it.effect("shutdown with take fiber", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId
      const queue = yield* Queue.bounded<number>(3)
      const fiber = yield* Effect.fork(Queue.take(queue))
      yield* waitForSize(queue, -1)
      yield* Queue.shutdown(queue)
      const result = yield* Effect.either(Effect.sandbox(Fiber.join(fiber)))
      assertLeft(result, Cause.interrupt(fiberId))
    }))
  it.effect("shutdown with offer fiber", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId
      const queue = yield* Queue.bounded<number>(2)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 1)
      const fiber = yield* pipe(Queue.offer(queue, 1), Effect.fork)
      yield* waitForSize(queue, 3)
      yield* Queue.shutdown(queue)
      const result = yield* Effect.either(Effect.sandbox(Fiber.join(fiber)))
      assertLeft(result, Cause.interrupt(fiberId))
    }))
  it.effect("shutdown with offer", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(Queue.offer(queue, 1), Effect.sandbox, Effect.either)
      assertLeft(result, Cause.interrupt(fiberId))
    }))
  it.effect("shutdown with take", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(Queue.take(queue), Effect.sandbox, Effect.either)
      assertLeft(result, Cause.interrupt(fiberId))
    }))
  it.effect("shutdown with takeAll", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(Queue.takeAll(queue), Effect.sandbox, Effect.either)
      assertLeft(result, Cause.interrupt(fiberId))
    }))
  it.effect("shutdown with takeUpTo", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(Queue.takeUpTo(queue, 1), Effect.sandbox, Effect.either)
      assertLeft(result, Cause.interrupt(fiberId))
    }))
  it.effect("shutdown with size", () =>
    Effect.gen(function*() {
      const fiberId = yield* Effect.fiberId
      const queue = yield* Queue.bounded<number>(1)
      yield* Queue.shutdown(queue)
      const result = yield* pipe(Queue.size(queue), Effect.sandbox, Effect.either)
      assertLeft(result, Cause.interrupt(fiberId))
    }))
  it.effect("shutdown race condition with offer", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      const fiber = yield* pipe(Queue.offer(queue, 1), Effect.forever, Effect.fork)
      yield* Queue.shutdown(queue)
      const result = yield* Fiber.await(fiber)
      assertTrue(Exit.isFailure(result))
    }))
  it.effect("shutdown race condition with take", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(2)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 1)
      const fiber = yield* pipe(Queue.take(queue), Effect.forever, Effect.fork)
      yield* Queue.shutdown(queue)
      const result = yield* Fiber.await(fiber)
      assertTrue(Exit.isFailure(result))
    }))
  it.effect("isShutdown indicates shutdown status", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(5)
      const result1 = yield* Queue.isShutdown(queue)
      yield* Queue.offer(queue, 1)
      const result2 = yield* Queue.isShutdown(queue)
      yield* Queue.takeAll(queue)
      const result3 = yield* Queue.isShutdown(queue)
      yield* Queue.shutdown(queue)
      const result4 = yield* Queue.isShutdown(queue)
      assertFalse(result1)
      assertFalse(result2)
      assertFalse(result3)
      assertTrue(result4)
    }))
  it.effect("takeAll returns all values from a non-empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      const result = yield* Queue.takeAll(queue)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 3))
    }))
  it.effect("elements can be enqueued syncroniously when there is space", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      Queue.unsafeOffer(queue, 1)
      Queue.unsafeOffer(queue, 2)
      Queue.unsafeOffer(queue, 3)
      const result = yield* Queue.takeAll(queue)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 3))
    }))
  it.effect("takeAll returns all values from an empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      const result1 = yield* Queue.takeAll(queue)
      yield* Queue.offer(queue, 1)
      yield* Queue.take(queue)
      const result2 = yield* Queue.takeAll(queue)
      assertTrue(Chunk.isEmpty(result1))
      assertTrue(Chunk.isEmpty(result2))
    }))
  it.effect("takeAll does not return more than the queue size", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(4)
      yield* [1, 2, 3, 4]
        .map((n) => Queue.offer(queue, n))
        .reduce((acc, curr) => pipe(acc, Effect.zipRight(curr)), Effect.succeed(false))
      yield* pipe(Queue.offer(queue, 5), Effect.fork)
      yield* waitForSize(queue, 5)
      const result1 = yield* Queue.takeAll(queue)
      const result2 = yield* Queue.take(queue)
      deepStrictEqual(Chunk.toReadonlyArray(result1), Array.range(1, 4))
      strictEqual(result2, 5)
    }))
  it.effect("takeBetween returns immediately if there is enough elements", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      const result = yield* Queue.takeBetween(queue, 2, 5)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 3))
    }))
  it.effect("takeBetween returns an empty list if boundaries are inverted", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      const result = yield* Queue.takeBetween(queue, 5, 2)
      assertTrue(Chunk.isEmpty(result))
    }))
  it.effect("takeBetween returns an empty list if boundaries are negative", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      const result = yield* Queue.takeBetween(queue, -5, -2)
      assertTrue(Chunk.isEmpty(result))
    }))
  it.effect("takeBetween blocks until a required minimum of elements is collected", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const updater = pipe(Queue.offer(queue, 10), Effect.forever)
      const getter = Queue.takeBetween(queue, 5, 10)
      const result = yield* pipe(getter, Effect.race(updater))
      assertTrue(result.length >= 5)
    }))
  it.effect("takeBetween returns elements in the correct order", () =>
    Effect.gen(function*() {
      const values = [-10, -7, -4, -1, 5, 10]
      const queue = yield* Queue.bounded<number>(100)
      const fiber = yield* pipe(values, Effect.forEach((n) => Queue.offer(queue, n)), Effect.fork)
      const result = yield* Queue.takeBetween(queue, values.length, values.length)
      yield* Fiber.interrupt(fiber)
      deepStrictEqual(Array.fromIterable(result), values)
    }))
  it.effect("takeN returns immediately if there is enough elements", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offerAll(queue, [1, 2, 3, 4, 5])
      const result = yield* Queue.takeN(queue, 3)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 3))
    }))
  it.effect("takeN returns an empty list if a negative number or zero is specified", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offerAll(queue, [1, 2, 3])
      const result1 = yield* Queue.takeN(queue, -3)
      const result2 = yield* Queue.takeN(queue, 0)
      assertTrue(Chunk.isEmpty(result1))
      assertTrue(Chunk.isEmpty(result2))
    }))
  it.effect("takeN blocks until the required number of elements is available", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const updater = pipe(Queue.offer(queue, 10), Effect.forever)
      const getter = Queue.takeN(queue, 5)
      const result = yield* pipe(getter, Effect.race(updater))
      strictEqual(result.length, 5)
    }))
  it.effect("should return the specified number of elements from a non-empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      const result = yield* Queue.takeUpTo(queue, 2)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 2))
    }))
  it.effect("should return an empty collection from an empty queue", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const result = yield* Queue.takeUpTo(queue, 2)
      assertTrue(Chunk.isEmpty(result))
    }))
  it.effect("should handle an empty queue with max higher than queue size", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      const result = yield* Queue.takeUpTo(queue, 101)
      assertTrue(Chunk.isEmpty(result))
    }))
  it.effect("should leave behind elements if necessary", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      yield* Queue.offer(queue, 4)
      const result = yield* Queue.takeUpTo(queue, 2)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 2))
    }))
  it.effect("should handle not enough items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      yield* Queue.offer(queue, 4)
      const result = yield* Queue.takeUpTo(queue, 10)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 4))
    }))
  it.effect("should handle taking up to 0 items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      yield* Queue.offer(queue, 4)
      const result = yield* Queue.takeUpTo(queue, 0)
      assertTrue(Chunk.isEmpty(result))
    }))
  it.effect("should handle taking up to -1 items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      yield* Queue.offer(queue, 4)
      const result = yield* Queue.takeUpTo(queue, -1)
      assertTrue(Chunk.isEmpty(result))
    }))
  it.effect("should handle taking up to Number.POSITIVE_INFINITY items", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      const result = yield* Queue.takeUpTo(queue, Number.POSITIVE_INFINITY)
      deepStrictEqual(Chunk.toReadonlyArray(result), [1])
    }))
  it.effect("multiple take up to calls", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      const result1 = yield* Queue.takeUpTo(queue, 2)
      yield* Queue.offer(queue, 3)
      yield* Queue.offer(queue, 4)
      const result2 = yield* Queue.takeUpTo(queue, 2)
      deepStrictEqual(Chunk.toReadonlyArray(result1), Array.range(1, 2))
      deepStrictEqual(Chunk.toReadonlyArray(result2), Array.range(3, 4))
    }))
  it.effect("consecutive take up to calls", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(100)
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      yield* Queue.offer(queue, 4)
      const result1 = yield* Queue.takeUpTo(queue, 2)
      const result2 = yield* Queue.takeUpTo(queue, 2)
      deepStrictEqual(Chunk.toReadonlyArray(result1), Array.range(1, 2))
      deepStrictEqual(Chunk.toReadonlyArray(result2), Array.range(3, 4))
    }))
  it.effect("does not return back-pressured offers", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.bounded<number>(4)
      yield* [1, 2, 3, 4]
        .map((n) => Queue.offer(queue, n))
        .reduce((acc, curr) => pipe(acc, Effect.zipRight(curr)), Effect.succeed(false))
      const fiber = yield* pipe(Queue.offer(queue, 5), Effect.fork)
      yield* waitForSize(queue, 5)
      const result = yield* Queue.takeUpTo(queue, 5)
      yield* Fiber.interrupt(fiber)
      deepStrictEqual(Chunk.toReadonlyArray(result), Array.range(1, 4))
    }))
  it.effect("rts - handles falsy values", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      yield* Queue.offer(queue, 0)
      const result = yield* Queue.take(queue)
      strictEqual(result, 0)
    }))
  it.effect("rts - queue is ordered", () =>
    Effect.gen(function*() {
      const queue = yield* Queue.unbounded<number>()
      yield* Queue.offer(queue, 1)
      yield* Queue.offer(queue, 2)
      yield* Queue.offer(queue, 3)
      const result1 = yield* Queue.take(queue)
      const result2 = yield* Queue.take(queue)
      const result3 = yield* Queue.take(queue)
      strictEqual(result1, 1)
      strictEqual(result2, 2)
      strictEqual(result3, 3)
    }))
  it.effect(
    ".pipe",
    () =>
      Effect.gen(function*() {
        const queue = yield* Queue.unbounded<number>()
        strictEqual(queue.pipe(identity), queue)
      })
  )
  it.effect(
    "is subtype of Effect",
    () =>
      Effect.gen(function*() {
        const queue = yield* Queue.unbounded<number>()
        yield* Queue.offer(queue, 1)
        const result1 = yield* queue
        strictEqual(result1, 1)
      })
  )
})

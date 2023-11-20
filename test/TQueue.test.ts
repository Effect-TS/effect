import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as STM from "effect/STM"
import * as TQueue from "effect/TQueue"
import { assert, describe } from "vitest"

describe.concurrent("TQueue", () => {
  it.effect("bounded", () =>
    Effect.gen(function*($) {
      const capacity = 5
      const result = yield* $(pipe(TQueue.bounded(capacity), STM.map(TQueue.capacity)))
      assert.strictEqual(result, capacity)
    }))

  it.effect("unbounded", () =>
    Effect.gen(function*($) {
      const result = yield* $(pipe(
        TQueue.unbounded(),
        STM.map(TQueue.capacity),
        STM.commit
      ))
      assert.strictEqual(result, Number.MAX_SAFE_INTEGER)
    }))

  it.effect("offer & take", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.bounded<number>(5))
      yield* $(pipe(queue, TQueue.offer(1)))
      yield* $(pipe(queue, TQueue.offer(2)))
      yield* $(pipe(queue, TQueue.offer(3)))
      const result1 = yield* $(TQueue.take(queue))
      const result2 = yield* $(TQueue.take(queue))
      const result3 = yield* $(TQueue.take(queue))
      assert.strictEqual(result1, 1)
      assert.strictEqual(result2, 2)
      assert.strictEqual(result3, 3)
    }))

  it.effect("offer & take undefined", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.bounded<undefined>(5))
      yield* $(pipe(queue, TQueue.offer(undefined)))
      yield* $(pipe(queue, TQueue.offer(undefined)))
      const result1 = yield* $(TQueue.take(queue))
      const result2 = yield* $(TQueue.take(queue))
      assert.strictEqual(result1, undefined)
      assert.strictEqual(result2, undefined)
    }))

  it.effect("offerAll & takeAll", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5]
      const queue = yield* $(TQueue.bounded<number>(5))
      yield* $(pipe(queue, TQueue.offerAll(array)))
      const result = yield* $(TQueue.takeAll(queue))
      assert.deepStrictEqual(Array.from(result), array)
    }))

  it.effect("takeUpTo", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.bounded<number>(5))
      yield* $(pipe(queue, TQueue.offerAll([1, 2, 3, 4, 5])))
      const result = yield* $(pipe(queue, TQueue.takeUpTo(3)))
      const size = yield* $(TQueue.size(queue))
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
      assert.strictEqual(size, 2)
    }))

  it.effect("takeUpTo - larger than queue", () =>
    Effect.gen(function*($) {
      const array = [1, 2, 3, 4, 5]
      const queue = yield* $(TQueue.bounded<number>(5))
      yield* $(pipe(queue, TQueue.offerAll(array)))
      const result = yield* $(pipe(queue, TQueue.takeUpTo(7)))
      const size = yield* $(TQueue.size(queue))
      assert.deepStrictEqual(Array.from(result), array)
      assert.strictEqual(size, 0)
    }))

  it.effect("poll", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.bounded<number>(5))
      yield* $(pipe(queue, TQueue.offerAll([1, 2, 3])))
      const result = yield* $(TQueue.poll(queue))
      assert.deepStrictEqual(result, Option.some(1))
    }))

  it.effect("poll undefined", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.bounded<undefined>(5))
      yield* $(pipe(queue, TQueue.offerAll([undefined, undefined, undefined])))
      const result = yield* $(TQueue.poll(queue))
      assert.deepStrictEqual(result, Option.some(undefined))
    }))

  it.effect("poll - empty queue", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.bounded<number>(5))
      const result = yield* $(TQueue.poll(queue))
      assert.deepStrictEqual(result, Option.none())
    }))

  it.effect("seek", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.bounded<number>(5))
      yield* $(pipe(queue, TQueue.offerAll([1, 2, 3, 4, 5])))
      const result = yield* $(pipe(queue, TQueue.seek((n) => n === 3)))
      const size = yield* $(TQueue.size(queue))
      assert.strictEqual(result, 3)
      assert.strictEqual(size, 2)
    }))

  it.effect("size", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.unbounded<number>())
      yield* $(pipe(queue, TQueue.offerAll([1, 2, 3, 4, 5])))
      const result = yield* $(TQueue.size(queue))
      assert.strictEqual(result, 5)
    }))

  it.effect("peek", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.unbounded<number>())
      yield* $(pipe(queue, TQueue.offerAll([1, 2, 3, 4, 5])))
      const result = yield* $(TQueue.peek(queue))
      const size = yield* $(TQueue.size(queue))
      assert.strictEqual(result, 1)
      assert.strictEqual(size, 5)
    }))

  it.effect("peekOption", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.unbounded<number>())
      yield* $(pipe(queue, TQueue.offerAll([1, 2, 3, 4, 5])))
      const result = yield* $(TQueue.peekOption(queue))
      const size = yield* $(TQueue.size(queue))
      assert.deepStrictEqual(result, Option.some(1))
      assert.strictEqual(size, 5)
    }))

  it.effect("peekOption - empty queu", () =>
    Effect.gen(function*($) {
      const queue = yield* $(TQueue.unbounded<number>())
      const result = yield* $(TQueue.peekOption(queue))
      assert.deepStrictEqual(result, Option.none())
    }))

  it.effect("isEmpty", () =>
    Effect.gen(function*($) {
      const queue1 = yield* $(TQueue.unbounded<number>())
      const queue2 = yield* $(TQueue.unbounded<number>())
      yield* $(pipe(queue1, TQueue.offerAll([1, 2, 3, 4, 5])))
      const result1 = yield* $(TQueue.isEmpty(queue1))
      const result2 = yield* $(TQueue.isEmpty(queue2))
      assert.isFalse(result1)
      assert.isTrue(result2)
    }))

  it.effect("isFull", () =>
    Effect.gen(function*($) {
      const queue1 = yield* $(TQueue.bounded<number>(5))
      const queue2 = yield* $(TQueue.bounded<number>(5))
      yield* $(pipe(queue1, TQueue.offerAll([1, 2, 3, 4, 5])))
      const result1 = yield* $(TQueue.isFull(queue1))
      const result2 = yield* $(TQueue.isFull(queue2))
      assert.isTrue(result1)
      assert.isFalse(result2)
    }))
})

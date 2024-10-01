import * as Chunk from "effect/Chunk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { constVoid, pipe } from "effect/Function"
import * as HashSet from "effect/HashSet"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import * as it from "effect/test/utils/extend"
import * as TestClock from "effect/TestClock"
import * as TestServices from "effect/TestServices"
import { assert, describe } from "vitest"

describe("Stream", () => {
  it.effect("merge - slower stream", () =>
    Effect.gen(function*($) {
      const stream1 = Stream.make(1, 2, 3, 4)
      const stream2 = Stream.tap(
        Stream.make(5, 6, 7, 8),
        () => TestServices.provideLive(Effect.sleep(Duration.millis(10)))
      )
      const result = yield* $(
        Stream.merge(stream1, stream2),
        Stream.runCollect
      )
      assert.deepStrictEqual([...result], [1, 2, 3, 4, 5, 6, 7, 8])
    }))

  it.effect("mergeAll - short circuiting", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.mergeAll([Stream.never, Stream.make(1)], { concurrency: 2 }),
        Stream.take(1),
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), [1])
    }))

  it.effect("mergeWithTag", (ctx) =>
    Effect.gen(function*() {
      const stream = Stream.mergeWithTag({
        a: Stream.make(0),
        b: Stream.make("")
      }, { concurrency: 1 })

      const res = Chunk.toArray(yield* Stream.runCollect(stream))
      ctx.expect(res).toEqual([
        { _tag: "a", value: 0 },
        { _tag: "b", value: "" }
      ])
    }))

  it.effect("mergeHaltLeft - terminates as soon as the first stream terminates", () =>
    Effect.gen(function*($) {
      const queue1 = yield* $(Queue.unbounded<number>())
      const queue2 = yield* $(Queue.unbounded<number>())
      const stream1 = Stream.fromQueue(queue1)
      const stream2 = Stream.fromQueue(queue2)
      const fiber = yield* $(
        stream1,
        Stream.merge(stream2, { haltStrategy: "left" }),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(Queue.offer(queue1, 1), Effect.zipRight(TestClock.adjust(Duration.seconds(1))))
      yield* $(Queue.offer(queue1, 2), Effect.zipRight(TestClock.adjust(Duration.seconds(1))))
      yield* $(Queue.shutdown(queue1), Effect.zipRight(TestClock.adjust(Duration.seconds(1))))
      yield* $(Queue.offer(queue2, 3))
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(Array.from(result), [1, 2])
    }))

  it.effect("mergeHaltEither - interrupts pulling on finish", () =>
    Effect.gen(function*($) {
      const stream1 = Stream.make(1, 2, 3)
      const stream2 = Stream.fromEffect(pipe(Effect.sleep(Duration.seconds(5)), Effect.as(4)))
      const result = yield* $(
        stream1,
        Stream.merge(stream2, { haltStrategy: "left" }),
        Stream.runCollect
      )
      assert.deepStrictEqual(Array.from(result), [1, 2, 3])
    }))

  it.effect("mergeHaltRight - terminates as soon as the second stream terminates", () =>
    Effect.gen(function*($) {
      const queue1 = yield* $(Queue.unbounded<number>())
      const queue2 = yield* $(Queue.unbounded<number>())
      const stream1 = Stream.fromQueue(queue1)
      const stream2 = Stream.fromQueue(queue2)
      const fiber = yield* $(
        stream1,
        Stream.merge(stream2, { haltStrategy: "right" }),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(Queue.offer(queue2, 1), Effect.zipRight(TestClock.adjust(Duration.seconds(1))))
      yield* $(Queue.offer(queue2, 2), Effect.zipRight(TestClock.adjust(Duration.seconds(1))))
      yield* $(Queue.shutdown(queue2), Effect.zipRight(TestClock.adjust(Duration.seconds(1))))
      yield* $(Queue.offer(queue1, 3))
      const result = yield* $(Fiber.join(fiber))
      assert.deepStrictEqual(Array.from(result), [1, 2])
    }))

  it.effect("mergeHaltEither - terminates as soon as either stream terminates", () =>
    Effect.gen(function*($) {
      const queue1 = yield* $(Queue.unbounded<number>())
      const queue2 = yield* $(Queue.unbounded<number>())
      const stream1 = Stream.fromQueue(queue1)
      const stream2 = Stream.fromQueue(queue2)
      const fiber = yield* $(
        stream1,
        Stream.merge(stream2, { haltStrategy: "either" }),
        Stream.runCollect,
        Effect.fork
      )
      yield* $(Queue.shutdown(queue1))
      yield* $(TestClock.adjust(Duration.seconds(1)))
      yield* $(Queue.offer(queue2, 1))
      const result = yield* $(Fiber.join(fiber))
      assert.isTrue(Chunk.isEmpty(result))
    }))

  it.effect("merge - equivalence with set union", () =>
    Effect.gen(function*($) {
      const stream1 = Stream.make(1, 2, 3, 4)
      const stream2 = Stream.make(5, 6, 7, 8)
      const { result1, result2 } = yield* $(Effect.all({
        result1: pipe(
          stream1,
          Stream.merge(stream2),
          Stream.runCollect,
          Effect.map(HashSet.fromIterable)
        ),
        result2: pipe(
          Stream.runCollect(stream1),
          Effect.zipWith(
            Stream.runCollect(stream2),
            (chunk1, chunk2) => pipe(chunk1, Chunk.appendAll(chunk2))
          ),
          Effect.map(HashSet.fromIterable)
        )
      }))
      assert.deepStrictEqual(Array.from(result1), Array.from(result2))
    }))

  it.effect("merge - fails as soon as one stream fails", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        Stream.make(1, 2, 3),
        Stream.merge(Stream.fail(void 0)),
        Stream.runCollect,
        Effect.exit
      )
      assert.isTrue(Exit.isFailure(result))
    }))

  it.effect("mergeWith - prioritizes failures", () =>
    Effect.gen(function*($) {
      const stream1 = Stream.never
      const stream2 = Stream.fail("Ouch")
      const result = yield* $(
        stream1,
        Stream.mergeWith(stream2, { onSelf: constVoid, onOther: constVoid }),
        Stream.runCollect,
        Effect.either
      )
      assert.deepStrictEqual(result, Either.left("Ouch"))
    }))
})

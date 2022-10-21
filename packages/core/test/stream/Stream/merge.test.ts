import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("merge", () => {
    it("short circuiting", () =>
      Do(($) => {
        const stream = Stream.mergeAll(2)(Stream.never, Stream(1)).take(1)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(1))
      }).unsafeRunPromise())

    it("equivalence with set union", () =>
      Do(($) => {
        const stream1 = Stream(1, 2, 3)
        const stream2 = Stream(3, 4, 5)
        const mergedStream = $(
          stream1
            .merge(stream2)
            .runCollect
            .map((chunk) => Chunk.from(new Set(chunk)))
        )
        const mergedChunks = $(
          stream1
            .runCollect
            .zipWith(stream2.runCollect, (c1, c2) => c1 + c2)
            .map((chunk) => Chunk.from(new Set(chunk)))
        )
        assert.isTrue(mergedStream == mergedChunks)
      }).unsafeRunPromise())

    it("fail as soon as one stream fails", () =>
      Do(($) => {
        const stream = Stream(1, 2, 3).merge(Stream.failSync(undefined))
        const result = $(stream.runCollect.exit.map((exit) => exit.isSuccess()))
        assert.isFalse(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("mergeTerminateLeft", () => {
    it.effect("terminates as soon as the first stream terminates", () =>
      Do(($) => {
        const queue1 = $(Queue.unbounded<number>())
        const queue2 = $(Queue.unbounded<number>())
        const stream1 = Stream.fromQueue(queue1)
        const stream2 = Stream.fromQueue(queue2)
        const fiber = $(stream1.mergeTerminateLeft(stream2).runCollect.fork)
        $(queue1.offer(1).zipRight(TestClock.adjust((1).seconds)))
        $(queue1.offer(2).zipRight(TestClock.adjust((1).seconds)))
        $(queue1.shutdown.zipRight(TestClock.adjust((1).seconds)))
        $(queue2.offer(3))
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(1, 2))
      }))

    it("interrupts pulling on finish", () =>
      Do(($) => {
        const stream1 = Stream(1, 2, 3)
        const stream2 = Stream.fromEffect(Effect.sleep((5).seconds).as(4))
        const result = $(stream1.mergeTerminateLeft(stream2).runCollect)
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())
  })

  describe.concurrent("mergeTerminateRight", () => {
    it.effect("terminates as soon as the second stream terminates", () =>
      Do(($) => {
        const queue1 = $(Queue.unbounded<number>())
        const queue2 = $(Queue.unbounded<number>())
        const stream1 = Stream.fromQueue(queue1)
        const stream2 = Stream.fromQueue(queue2)
        const fiber = $(stream1.mergeTerminateRight(stream2).runCollect.fork)
        $(queue2.offer(2).zipRight(TestClock.adjust((1).seconds)))
        $(queue2.offer(3).zipRight(TestClock.adjust((1).seconds)))
        $(queue2.shutdown.zipRight(TestClock.adjust((1).seconds)))
        $(queue1.offer(1))
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(2, 3))
      }))
  })

  describe.concurrent("mergeTerminateEither", () => {
    it.effect("terminates as soon as either stream terminates", () =>
      Do(($) => {
        const queue1 = $(Queue.unbounded<number>())
        const queue2 = $(Queue.unbounded<number>())
        const stream1 = Stream.fromQueue(queue1)
        const stream2 = Stream.fromQueue(queue2)
        const fiber = $(stream1.mergeTerminateEither(stream2).runCollect.fork)
        $(queue1.shutdown)
        $(TestClock.adjust((1).seconds))
        $(queue2.offer(1))
        const result = $(fiber.join)
        assert.isTrue(result.isEmpty)
      }))
  })

  describe.concurrent("mergeWith", () => {
    it("prioritizes failure", () =>
      Do(($) => {
        const stream1 = Stream.never
        const stream2 = Stream.failSync("ouch")
        const result = $(stream1.mergeWith(stream2, constVoid, constVoid).runCollect.either)
        assert.isTrue(result == Either.left("ouch"))
      }).unsafeRunPromise())
  })
})

import { chunkCoordination } from "@effect/core/test/stream/Stream/test-utils"
import { constFalse } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("timeout", () => {
    it("succeed", () =>
      Do(($) => {
        const duration = Duration.Infinity
        const stream = Stream(1).timeout(duration)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(1))
      }).unsafeRunPromise())

    it("should end stream", () =>
      Do(($) => {
        const stream = Stream.range(0, 5).tap(() => Effect.never).timeout((0).millis)
        const result = $(stream.runCollect)
        assert.isTrue(result.isEmpty)
      }).unsafeRunPromise())
  })

  describe.concurrent("timeoutFail", () => {
    it("succeed", () =>
      Do(($) => {
        const stream = Stream.range(0, 5)
          .tap(() => Effect.never)
          .timeoutFail(constFalse, (0).millis)
        const result = $(stream.runDrain.either)
        assert.isTrue(result == Either.left(false))
      }).unsafeRunPromise())

    it("fail", () =>
      Do(($) => {
        const stream = Stream.fail("original").timeoutFail("timeout", (15).minutes)
        const result = $(stream.runDrain.flip)
        assert.strictEqual(result, "original")
      }).unsafeRunPromise())
  })

  describe.concurrent("timeoutFailCause", () => {
    it("fail", () =>
      Do(($) => {
        const error = new RuntimeError("boom")
        const stream = Stream.range(0, 5)
          .tap(() => Effect.never)
          .timeoutFailCause(Cause.die(error), (0).millis)
        const result = $(stream.runDrain.sandbox.either)
        assert.isTrue(result == Either.left(Cause.die(error)))
      }).unsafeRunPromise())
  })

  describe.concurrent("timeoutTo", () => {
    it("succeed", () =>
      Do(($) => {
        const duration = Duration.Infinity
        const stream = Stream.range(0, 5).timeoutTo(duration, Stream(-1))
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk(0, 1, 2, 3, 4))
      }).unsafeRunPromise())

    it.effect("should switch stream", () =>
      Do(($) => {
        const chunks = List(Chunk(1), Chunk(2), Chunk(3))
        const coordination = $(chunkCoordination(chunks))
        const stream = Stream.fromQueue(coordination.queue)
          .collectWhileSuccess
          .flattenChunks
          .timeoutTo((2).seconds, Stream(4))
          .tap(() => coordination.proceed)
        const fiber = $(stream.runCollect.fork)
        $(
          coordination.offer
            .zipRight(TestClock.adjust((1).seconds))
            .zipRight(coordination.awaitNext)
        )
        $(
          coordination.offer
            .zipRight(TestClock.adjust((3).seconds))
            .zipRight(coordination.awaitNext)
        )
        $(coordination.offer)
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(1, 2, 4))
      }))

    it.effect("should not apply timeout after switch", () =>
      Do(($) => {
        const queue1 = $(Queue.unbounded<number>())
        const queue2 = $(Queue.unbounded<number>())
        const stream1 = Stream.fromQueue(queue1)
        const stream2 = Stream.fromQueue(queue2)
        const fiber = $(stream1.timeoutTo((2).seconds, stream2).runCollect.fork)
        $(queue1.offer(1).zipRight(TestClock.adjust((1).seconds)))
        $(queue1.offer(2).zipRight(TestClock.adjust((3).seconds)))
        $(queue1.offer(3))
        $(queue2.offer(4).zipRight(TestClock.adjust((3).seconds)))
        $(queue2.offer(5).zipRight(queue2.shutdown))
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(1, 2, 4, 5))
      }))
  })
})

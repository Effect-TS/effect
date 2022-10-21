import { chunkCoordination } from "@effect/core/test/stream/Stream/test-utils"

describe.concurrent("Stream", () => {
  describe.concurrent("haltWhen", () => {
    it("halts after the current element", () =>
      Do(($) => {
        const interrupted = $(Ref.make(false))
        const latch = $(Deferred.make<never, void>())
        const halt = $(Deferred.make<never, void>())
        const stream = Stream
          .fromEffect(latch.await.onInterrupt(() => interrupted.set(true)))
          .haltWhen(halt.await)
        $(stream.runDrain.fork)
        $(halt.succeed(undefined))
        $(latch.succeed(undefined))
        const result = $(interrupted.get)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("propagates errors", () =>
      Do(($) => {
        const halt = $(Deferred.make<string, never>())
        const stream = Stream(0).forever.haltWhen(halt.await)
        $(halt.fail("fail"))
        const result = $(stream.runDrain.either)
        assert.isTrue(result == Either.left("fail"))
      }).unsafeRunPromise())
  })

  describe.concurrent("haltWhenDeferred", () => {
    it("halts after the current element", () =>
      Do(($) => {
        const interrupted = $(Ref.make(false))
        const latch = $(Deferred.make<never, void>())
        const halt = $(Deferred.make<never, void>())
        const stream = Stream
          .fromEffect(latch.await.onInterrupt(() => interrupted.set(true)))
          .haltWhenDeferred(halt)
        $(stream.runDrain.fork)
        $(halt.succeed(undefined))
        $(latch.succeed(undefined))
        const result = $(interrupted.get)
        assert.isFalse(result)
      }).unsafeRunPromise())

    it("propagates errors", () =>
      Do(($) => {
        const halt = $(Deferred.make<string, void>())
        const stream = Stream(0).forever.haltWhenDeferred(halt)
        $(halt.fail("fail"))
        const result = $(stream.runDrain.either)
        assert.isTrue(result == Either.left("fail"))
      }).unsafeRunPromise())
  })

  describe.concurrent("haltAfter", () => {
    it.effect("halts after given duration", () =>
      Do(($) => {
        const chunks = List(Chunk(1), Chunk(2), Chunk(3), Chunk(4))
        const coordination = $(chunkCoordination(chunks))
        const stream = Stream.fromQueue(coordination.queue)
          .collectWhileSuccess
          .haltAfter((5).seconds)
          .tap(() => coordination.proceed)
        const fiber = $(stream.runCollect.fork)
        $(
          coordination.offer
            .zipRight(TestClock.adjust((3).seconds))
            .zipRight(coordination.awaitNext)
        )
        $(
          coordination.offer
            .zipRight(TestClock.adjust((3).seconds))
            .zipRight(coordination.awaitNext)
        )
        $(
          coordination.offer
            .zipRight(TestClock.adjust((3).seconds))
            .zipRight(coordination.awaitNext)
        )
        $(coordination.offer)
        const result = $(fiber.join)
        const expected = Chunk(Chunk(1), Chunk(2), Chunk(3))
        assert.isTrue(result == expected)
      }))

    it.effect("will process first chunk", () =>
      Do(($) => {
        const queue = $(Queue.unbounded<number>())
        const stream = Stream.fromQueue(queue).haltAfter((5).seconds)
        const fiber = $(stream.runCollect.fork)
        $(TestClock.adjust((6).seconds))
        $(queue.offer(1))
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(1))
      }))
  })
})

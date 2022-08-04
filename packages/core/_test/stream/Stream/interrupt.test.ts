import { chunkCoordination } from "@effect/core/test/stream/Stream/test-utils"

describe.concurrent("Stream", () => {
  describe.concurrent("interruptWhen", () => {
    it("preserves scope of inner fibers", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const queue1 = $(Queue.unbounded<Chunk<number>>())
        const queue2 = $(Queue.unbounded<Chunk<number>>())
        $(queue1.offer(Chunk(1)))
        $(queue2.offer(Chunk(2)))
        $(queue1.offer(Chunk(3)).fork)
        $(queue2.offer(Chunk(4)).fork)
        const stream1 = Stream.fromChunkQueue(queue1)
        const stream2 = Stream.fromChunkQueue(queue2)
        const stream3 = stream1
          .zipWithLatest(stream2, (a, b) => Tuple(a, b))
          .interruptWhen(deferred.await)
          .take(3)
        const result = $(stream3.runDrain)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("interrupts the current element", () =>
      Do(($) => {
        const interrupted = $(Ref.make(false))
        const latch = $(Deferred.make<never, void>())
        const halt = $(Deferred.make<never, void>())
        const started = $(Deferred.make<never, void>())
        const effect = started.succeed(undefined)
          .zipRight(latch.await)
          .onInterrupt(() => interrupted.set(true))
        const stream = Stream.fromEffect(effect).interruptWhen(halt.await)
        const fiber = $(stream.runDrain.fork)
        $(started.await.zipRight(halt.succeed(undefined)))
        $(fiber.await)
        const result = $(interrupted.get)
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("propagates errors", () =>
      Do(($) => {
        const halt = $(Deferred.make<string, never>())
        const stream = Stream.fromEffect(Effect.never).interruptWhen(halt.await)
        $(halt.fail("fail"))
        const result = $(stream.runDrain.either)
        assert.isTrue(result == Either.left("fail"))
      }).unsafeRunPromise())
  })

  describe.concurrent("interruptWhenDeferred", () => {
    it("interrupts the current element", () =>
      Do(($) => {
        const deferred = $(Deferred.make<never, void>())
        const queue1 = $(Queue.unbounded<Chunk<number>>())
        const queue2 = $(Queue.unbounded<Chunk<number>>())
        $(queue1.offer(Chunk(1)))
        $(queue2.offer(Chunk(2)))
        $(queue1.offer(Chunk(3)).fork)
        $(queue2.offer(Chunk(4)).fork)
        const stream1 = Stream.fromChunkQueue(queue1)
        const stream2 = Stream.fromChunkQueue(queue2)
        const stream3 = stream1.zipWithLatest(stream2, (a, b) => Tuple(a, b))
          .interruptWhenDeferred(deferred)
          .take(3)
        const result = $(stream3.runDrain)
        assert.isUndefined(result)
      }).unsafeRunPromise())

    it("propagates errors", () =>
      Do(($) => {
        const halt = $(Deferred.make<string, never>())
        const stream = Stream.fromEffect(Effect.never).interruptWhenDeferred(halt)
        $(halt.fail("fail"))
        const result = $(stream.runDrain.either)
        assert.isTrue(result == Either.left("fail"))
      }).unsafeRunPromise())
  })

  describe.concurrent("interruptAfter", () => {
    it.effect("interrupts after given duration", () =>
      Do(($) => {
        const chunks = List(Chunk(1), Chunk(2), Chunk(3))
        const coordination = $(chunkCoordination(chunks))
        const stream = Stream.fromQueue(coordination.queue)
          .collectWhileSuccess
          .interruptAfter((5).seconds)
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
        $(coordination.offer)
        const result = $(fiber.join)
        const expected = Chunk(Chunk(1), Chunk(2))
        assert.isTrue(result == expected)
      }))

    it.effect("interrupts before first chunk", () =>
      Do(($) => {
        const queue = $(Queue.unbounded<number>())
        const stream = Stream.fromQueue(queue).interruptAfter((5).seconds)
        const fiber = $(stream.runCollect.fork)
        $(TestClock.adjust((6).seconds))
        $(queue.offer(1))
        const result = $(fiber.join)
        assert.isTrue(result.isEmpty)
      }))
  })
})

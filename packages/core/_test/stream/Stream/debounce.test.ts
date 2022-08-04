import { chunkCoordination } from "@effect/core/test/stream/Stream/test-utils"

describe.concurrent("Stream", () => {
  describe.concurrent("debounce", () => {
    it.effect("should drop earlier chunks within waitTime", () =>
      Do(($) => {
        const chunks = List(Chunk(1), Chunk(3, 4), Chunk(5), Chunk(6, 7))
        const coordination = $(chunkCoordination(chunks))
        const stream = Stream.fromQueue(coordination.queue)
          .collectWhileSuccess
          .debounce((1).seconds)
          .tap(() => coordination.proceed)
        const fiber = $(stream.runCollect.fork)
        $(coordination.offer.fork)
        $(Clock.sleep((500).millis).zipRight(coordination.offer).fork)
        $(Clock.sleep((2).seconds).zipRight(coordination.offer).fork)
        $(Clock.sleep((2500).millis).zipRight(coordination.offer).fork)
        $(TestClock.adjust((3500).millis))
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(Chunk(3, 4), Chunk(6, 7)))
      }))

    it.effect("should take latest chunk within waitTime", () =>
      Do(($) => {
        const chunks = List(Chunk(1, 2), Chunk(3, 4), Chunk(5, 6))
        const coordination = $(chunkCoordination(chunks))
        const stream = Stream.fromQueue(coordination.queue)
          .collectWhileSuccess
          .debounce((1).seconds)
          .tap(() => coordination.proceed)
        const fiber = $(stream.runCollect.fork)
        $(coordination.offer.repeatN(3))
        $(TestClock.adjust((1).seconds))
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(Chunk(5, 6)))
      }))

    it.effect("should work properly with parallelization", () =>
      Do(($) => {
        const chunks = List(Chunk(1), Chunk(2), Chunk(3))
        const coordination = $(chunkCoordination(chunks))
        const stream = Stream.fromQueue(coordination.queue)
          .collectWhileSuccess
          .debounce((1).seconds)
          .tap(() => coordination.proceed)
        const fiber = $(stream.runCollect.fork)
        $(Effect.collectAllParDiscard(coordination.offer.replicate(3)))
        $(TestClock.adjust((1).seconds))
        const result = $(fiber.join)
        assert.strictEqual(result.length, 1)
      }))

    it.effect("should handle empty chunks properly", () =>
      Do(($) => {
        const stream = Stream(1, 2, 3).fixed((500).millis).debounce((1).seconds)
        const fiber = $(stream.runCollect.fork)
        $(TestClock.adjust((3).seconds))
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(3))
      }))

    it("should fail immediately", () =>
      Do(($) => {
        const stream = Stream.fromEffect(Effect.failSync(Maybe.none))
          .debounce((100_000_000).millis)
        const result = $(stream.runCollect.either)
        assert.isTrue(result == Either.left(Maybe.none))
      }).unsafeRunPromise())

    it("should work with empty streams", () =>
      Do(($) => {
        const stream = Stream.empty.debounce((100_000_000).millis)
        const result = $(stream.runCollect)
        assert.isTrue(result.isEmpty)
      }).unsafeRunPromise())

    it.effect("should pick last element from every chunk", () =>
      Do(($) => {
        const stream = Stream(1, 2, 3).debounce((1).seconds)
        const fiber = $(stream.runCollect.fork)
        $(TestClock.adjust((1).seconds))
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(3))
      }))

    it.effect("should interrupt fibers properly", () =>
      Do(($) => {
        const chunks = List(Chunk(1), Chunk(2), Chunk(3))
        const coordination = $(chunkCoordination(chunks))
        const stream = Stream.fromQueue(coordination.queue)
          .tap(() => coordination.proceed)
          .flatMap((exit) => Stream.fromEffectMaybe(Effect.done(exit)))
          .flattenCollection
          .debounce((200).millis)
          .interruptWhen(Effect.never)
          .take(1)
        const fiber = $(stream.runCollect.fork)
        $(
          coordination.offer
            .zipRight(TestClock.adjust((100).millis))
            .zipRight(coordination.awaitNext)
            .repeatN(3)
        )
        const result = $(fiber.join)
        assert.isTrue(result == Chunk(3))
      }))

    it.effect("should interrupt children fiber on stream interruption", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const stream = Stream.fromEffect(Effect.unit)
          .concat(Stream.fromEffect(Effect.never.onInterrupt(() => ref.set(true))))
          .debounce((800).millis)
        const fiber = $(stream.runDrain.fork)
        $(TestClock.adjust((1).minutes))
        $(fiber.interrupt)
        const result = $(ref.get)
        assert.isTrue(result)
      }))
  })
})

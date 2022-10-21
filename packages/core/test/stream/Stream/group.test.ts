// import { Handoff } from "@effect/core/stream/Stream/operations/_internal/Handoff"
// import { chunkCoordination } from "@effect/core/test/stream/Stream/test-utils"

describe.concurrent("Stream", () => {
  describe.concurrent("groupBy", () => {
    it("values", () =>
      Do(($) => {
        const words = Chunk.fill(10, () => Chunk.range(0, 10))
          .flatten
          .map((n) => n.toString())
        const stream = Stream.fromCollection(words)
          .groupByKey(identity, 8192)
          .mergeGroupBy((k, s) => Stream.fromEffect(s.runCollect.map((c) => [k, c.size] as const)))
        const result = $(stream.runCollect.map((chunk) => new Map(chunk.toArray)))
        const expected = new Map(
          Chunk.range(0, 10).map((n) => [n.toString(), 10] as const).toArray
        )
        assert.deepStrictEqual(result, expected)
      }).unsafeRunPromise())

    it("first", () =>
      Do(($) => {
        const words = Chunk.fill(10, () => Chunk.range(0, 10))
          .flatten
          .map((n) => n.toString())
        const stream = Stream.fromCollection(words)
          .groupByKey(identity, 1050)
          .first(2)
          .mergeGroupBy((k, s) => Stream.fromEffect(s.runCollect.map((c) => [k, c.size] as const)))
        const result = $(stream.runCollect.map((chunk) => new Map(chunk.toArray)))
        const expected = new Map(
          Chunk.range(0, 1).map((n) => [n.toString(), 10] as const).toArray
        )
        assert.deepStrictEqual(result, expected)
      }).unsafeRunPromise())

    it("filter", () =>
      Do(($) => {
        const words = Chunk.fill(10, () => Chunk.range(0, 10)).flatten
        const stream = Stream.fromCollection(words)
          .groupByKey(identity, 1050)
          .filter((n) => n <= 5)
          .mergeGroupBy((k, s) => Stream.fromEffect(s.runCollect.map((c) => [k, c.size] as const)))
        const result = $(stream.runCollect.map((chunk) => new Map(chunk.toArray)))
        const expected = new Map(Chunk.range(0, 5).map((n) => [n, 10] as const).toArray)
        assert.deepStrictEqual(result, expected)
      }).unsafeRunPromise())

    it("outer errors", () =>
      Do(($) => {
        const words = Chunk("abc", "test", "test", "foo")
        const stream = (Stream.fromCollection(words) + Stream.failSync("boom"))
          .groupByKey(identity)
          .mergeGroupBy((_, s) => s.drain)
        const result = $(stream.runCollect.either)
        assert.isTrue(result == Either.left("boom"))
      }).unsafeRunPromise())
  })

  describe.concurrent("grouped", () => {
    it("sanity", () =>
      Do(($) => {
        const stream = Stream(1, 2, 3, 4, 5).grouped(2)
        const result = $(stream.runCollect)
        const expected = Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5))
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("group size is correct", () =>
      Do(($) => {
        const stream = Stream.range(0, 100).grouped(10).map((chunk) => chunk.size)
        const result = $(stream.runCollect)
        assert.isTrue(result == Chunk.fill(10, () => 10))
      }).unsafeRunPromise())

    it("doesn't emit empty chunks", () =>
      Do(($) => {
        const stream = Stream.fromCollection(Chunk.empty<number>()).grouped(5)
        const result = $(stream.runCollect)
        assert.isTrue(result.isEmpty)
      }).unsafeRunPromise())

    it("is equivalent to Chunk.grouped", () =>
      Do(($) => {
        const stream = Stream.range(1, 10)
        const result1 = $(stream.grouped(2).runCollect)
        const chunk = $(stream.runCollect)
        const result2 = chunk.grouped(2)
        assert.isTrue(result1 == result2)
      }).unsafeRunPromise())

    it("emits elements properly when a failure occurs", () =>
      Do(($) => {
        const ref = $(Ref.make(Chunk.empty<Chunk<number>>()))
        const streamChunks = Stream.fromChunks(Chunk(1, 2, 3, 4), Chunk(5, 6, 7), Chunk(8))
        const stream = streamChunks.concat(Stream.failSync("ouch")).grouped(3)
          .mapEffect((chunk) => ref.update((chunks) => chunks.append(chunk)))
        const either = $(stream.runCollect.either)
        const result = $(ref.get)
        assert.isTrue(result == Chunk(Chunk(1, 2, 3), Chunk(4, 5, 6), Chunk(7, 8)))
        assert.isTrue(either == Either.left("ouch"))
      }).unsafeRunPromise())
  })

  describe.concurrent("groupedWithin", () => {
    // TODO(Mike/Max): Something in TestClock is causing the next two tests
    // to hang, specifically inside `TestClock.awaitSuspended`

    // it.effect("group based on time passed", () =>
    //   Do(($) => {
    //     const chunks = List(Chunk(1, 2), Chunk(3, 4), Chunk(5))
    //     const coordination = $(chunkCoordination(chunks))
    //     const stream = Stream.fromQueue(coordination.queue)
    //       .collectWhileSuccess
    //       .flattenChunks
    //       .groupedWithin(10, (2).seconds)
    //       .tap(() => coordination.proceed)
    //     const fiber = $(stream.runCollect.fork)
    //     $(
    //       coordination.offer
    //         .zipRight(Effect.log("HERE INNER 1"))
    //         .zipRight(TestClock.adjust((2).seconds))
    //         .zipRight(Effect.log("HERE INNER 1"))
    //         .zipRight(coordination.awaitNext)
    //         .zipRight(Effect.log("HERE INNER 3"))
    //     )
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((2).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     $(coordination.offer)
    //     const result = $(fiber.join.timeout((5).seconds))
    //     assert.isTrue(result == Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5)))
    //   }))

    // it.effect("group based on time passed (ZIO #5013)", () =>
    //   Do(($) => {
    //     const chunks = Chunk.range(1, 29).map(Chunk.single).toList
    //     const coordination = $(chunkCoordination(chunks))
    //     const latch = $(Handoff.make<void>())
    //     const ref = $(Ref.make(0))
    //     const sink = Sink.take(5)
    //     const stream = Stream.fromQueue(coordination.queue)
    //       .collectWhileSuccess
    //       .flattenChunks
    //       .tap(() => coordination.proceed)
    //       .groupedWithin(10, (3).seconds)
    //       .tap((chunk) =>
    //         ref.update((n) => n + chunk.size)
    //           .zipRight(latch.offer(undefined))
    //       )
    //     const fiber = $(stream.run(sink).fork)
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((1).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((1).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((1).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     const result0 = $(latch.take.zipRight(ref.get))
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((1).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((1).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((1).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     const result1 = $(latch.take.zipRight(ref.get))
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((1).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((1).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     $(
    //       coordination.offer
    //         .zipRight(TestClock.adjust((1).seconds))
    //         .zipRight(coordination.awaitNext)
    //     )
    //     const result2 = $(latch.take.zipRight(ref.get))
    //     // This part is to make sure schedule clock is being restarted
    //     // when the specified amount of elements has been reached
    //     $(
    //       TestClock.adjust((2).seconds)
    //         .zipRight(coordination.offer.zipRight(coordination.awaitNext).repeatN(9))
    //     )
    //     const result3 = $(latch.take.zipRight(ref.get))
    //     $(
    //       coordination.offer
    //         .zipRight(coordination.awaitNext)
    //         .zipRight(TestClock.adjust((2).seconds))
    //         .zipRight(coordination.offer.zipRight(coordination.awaitNext).repeatN(8))
    //     )
    //     const result4 = $(latch.take.zipRight(ref.get))
    //     const result = $(fiber.join)
    //     const expected = Chunk(
    //       Chunk(1, 2, 3),
    //       Chunk(4, 5, 6),
    //       Chunk(7, 8, 9),
    //       Chunk(10, 11, 12, 13, 14, 15, 16, 17, 18, 19),
    //       Chunk(20, 21, 22, 23, 24, 25, 26, 27, 28, 29)
    //     )
    //     assert.isTrue(result == expected)
    //     assert.strictEqual(result0, 3)
    //     assert.strictEqual(result1, 6)
    //     assert.strictEqual(result2, 9)
    //     assert.strictEqual(result3, 19)
    //     assert.strictEqual(result4, 29)
    //   }))

    it("group immediately when chunk size is reached", () =>
      Do(($) => {
        const stream = Stream(1, 2, 3, 4).groupedWithin(2, (10).seconds)
        const result = $(stream.runCollect)
        const expected = Chunk(Chunk(1, 2), Chunk(3, 4))
        assert.isTrue(result == expected)
      }).unsafeRunPromise())
  })
})

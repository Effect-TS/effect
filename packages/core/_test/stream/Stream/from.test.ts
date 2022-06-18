import { chunkCoordination } from "@effect/core/test/stream/Stream/test-utils"

describe.concurrent("Stream", () => {
  describe.concurrent("fromChunk", () => {
    it("simple example", async () => {
      const chunk = Chunk(1, 2, 3)
      const program = Stream.fromChunk(chunk).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == chunk)
    })
  })

  describe.concurrent("fromChunks", () => {
    it("simple example", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3), Chunk(4, 5, 6))
      const program = Stream.fromChunks(...chunks).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == chunks.flatten)
    })

    it("discards empty chunks", async () => {
      const chunks = Chunk(Chunk.single(1), Chunk.empty<number>(), Chunk.single(2))
      const program = Effect.scoped(
        Stream.fromChunks(...chunks)
          .toPull()
          .flatMap((pull) => Effect.forEach(Chunk.range(0, 2), () => pull.either()))
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Either.right(Chunk(1)),
          Either.right(Chunk(2)),
          Either.left(Maybe.none)
        )
      )
    })
  })

  describe.concurrent("fromEffect", () => {
    it("failure", async () => {
      const program = Stream.fromEffect(Effect.fail("error")).runCollect().either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("error"))
    })
  })

  describe.concurrent("fromEffectMaybe", () => {
    it("emit one element with success", async () => {
      const program = Stream.fromEffectMaybe(Effect.succeed(5)).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(5))
    })

    it("emit one element with failure", async () => {
      const program = Stream.fromEffectMaybe(Effect.fail(Maybe.some(5)))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(5))
    })

    it("do not emit any element", async () => {
      const program = Stream.fromEffectMaybe(Effect.fail(Maybe.none)).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })
  })

  describe.concurrent("fromIterable", () => {
    it("simple example", async () => {
      const program = Stream.fromCollection([1, 2, 3]).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })
  })

  describe.concurrent("fromIterableEffect", () => {
    it("simple example", async () => {
      const program = Stream.fromCollectionEffect(Effect.succeed([1, 2, 3])).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })
  })

  describe.concurrent("fromSchedule", () => {
    it("simple example", async () => {
      const schedule = Schedule.exponential((5).millis) < Schedule.recurs(5)
      const program = Stream.fromSchedule(schedule).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          (5).millis,
          (10).millis,
          (20).millis,
          (40).millis,
          (80).millis
        )
      )
    })
  })

  describe.concurrent("fromQueue", () => {
    it("emits queued elements", async () => {
      const program = chunkCoordination(List(Chunk(1, 2))).flatMap((c) =>
        Effect.Do()
          .bind("fiber", () =>
            Stream.fromQueue(c.queue)
              .collectWhileSuccess()
              .unchunks()
              .tap(() => c.proceed)
              .runCollect()
              .fork())
          .tap(() => c.offer)
          .flatMap(({ fiber }) => fiber.join())
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2))
    })

    it("chunks up to the max chunk size", async () => {
      const program = Effect.Do()
        .bind("queue", () => Queue.unbounded<number>())
        .tap(({ queue }) => queue.offerAll(Chunk(1, 2, 3, 4, 5, 6, 7)))
        .flatMap(({ queue }) =>
          Stream.fromQueue(queue, 2)
            .mapChunks((chunk) => Chunk.single(chunk))
            .take(3)
            .runCollect()
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.forAll((xs) => xs.length <= 2))
    })
  })
})

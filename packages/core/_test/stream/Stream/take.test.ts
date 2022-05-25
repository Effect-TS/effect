import { constFalse } from "@tsplus/stdlib/data/Function"

describe.concurrent("Stream", () => {
  describe.concurrent("take", () => {
    it("equivalence with Chunk.take", async () => {
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.take(3).runCollect(),
        chunkResult: stream.runCollect().map((chunk) => chunk.take(3))
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      assert.isTrue(streamResult == chunkResult)
    })

    it("take short circuits", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bindValue("stream", ({ ref }) => (Stream(1) + Stream.fromEffect(ref.set(true)).drain()).take(0))
        .tap(({ stream }) => stream.runDrain())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.isFalse(result)
    })

    it("take(0) short circuits", async () => {
      const program = Stream.never.take(0).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty())
    })

    it("take(1) short circuits", async () => {
      const program = (Stream(1) + Stream.never).take(1).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1))
    })
  })

  describe.concurrent("takeRight", () => {
    it("equivalence with Chunk.takeRight", async () => {
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.takeRight(3).runCollect(),
        chunkResult: stream.runCollect().map((chunk) => chunk.takeRight(3))
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      assert.isTrue(streamResult == chunkResult)
    })
  })

  describe.concurrent("takeUntil", () => {
    it("equivalence with negated Chunk.takeWhile", async () => {
      const f = (n: number) => n > 3
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.takeUntil(f).runCollect(),
        chunkResult: stream
          .runCollect()
          .map(
            (chunk) => chunk.takeWhile((n) => !f(n)) + chunk.dropWhile((n) => !f(n)).take(1)
          )
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      assert.isTrue(streamResult == chunkResult)
    })
  })

  describe.concurrent("takeUntilEffect", () => {
    it("equivalence with negated Chunk.takeWhileEffect", async () => {
      const f = (n: number) => Effect.succeed(n > 3)
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.takeUntilEffect(f).runCollect(),
        chunkResult: stream.runCollect().flatMap((chunk) =>
          chunk
            .takeWhileEffect((n) => f(n).negate())
            .zipWith(
              chunk.dropWhileEffect((n) => f(n).negate()).map((chunk) => chunk.take(1)),
              (a, b) => a + b
            )
        )
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      assert.isTrue(streamResult == chunkResult)
    })

    it("laziness on chunks", async () => {
      const program = Stream(1, 2, 3)
        .takeUntilEffect((n) => n === 2 ? Effect.fail("boom") : Effect.succeed(constFalse))
        .either()
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Either.right(1),
          Either.left("boom")
        )
      )
    })
  })

  describe.concurrent("takeWhile", () => {
    it("equivalence with Chunk.takeWhile", async () => {
      const f = (n: number) => n < 3
      const stream = Stream(0, 1, 2, 3, 4, 5)
      const program = Effect.struct({
        streamResult: stream.takeWhile(f).runCollect(),
        chunkResult: stream.runCollect().map((chunk) => chunk.takeWhile(f))
      })

      const { chunkResult, streamResult } = await program.unsafeRunPromise()

      assert.isTrue(streamResult == chunkResult)
    })

    it("takeWhile doesn't stop when hitting an empty chunk (ZIO issue #4272)", async () => {
      const program = Stream.fromChunks(Chunk(1), Chunk(2), Chunk(3))
        .mapChunks((chunk) => chunk.flatMap((n) => (n === 2 ? Chunk.empty() : Chunk(n))))
        .takeWhile((n) => n !== 4)
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 3))
    })

    it("takeWhile short circuits", async () => {
      const program = (Stream(1) + Stream("ouch"))
        .takeWhile(constFalse)
        .runDrain()
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.right(undefined))
    })
  })
})

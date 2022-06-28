describe.concurrent("Stream", () => {
  describe.concurrent("sliding", () => {
    it("returns a sliding window", async () => {
      const result = Chunk(Chunk(1, 2), Chunk(2, 3), Chunk(3, 4), Chunk(4, 5))
      const stream0 = Stream.fromChunks(Chunk.empty<number>(), Chunk(1), Chunk.empty<number>(), Chunk(2, 3, 4, 5))
      const stream1 = Stream.empty + Stream(1) + Stream.empty + Stream(2) + Stream(3, 4, 5)
      const stream2 = Stream(1) + Stream.empty + Stream(2) + Stream.empty + Stream(3, 4, 5)
      const stream3 = Stream.fromChunk(Chunk(1)) + Stream.fromChunk(Chunk(2)) + Stream(3, 4, 5)

      const program = Effect.struct({
        result1: Stream(1, 2, 3, 4, 5).sliding(2).runCollect,
        result2: stream0.sliding(2).runCollect,
        result3: stream1.sliding(2).runCollect,
        result4: stream2.sliding(2).runCollect,
        result5: stream3.sliding(2).runCollect
      })

      const { result1, result2, result3, result4, result5 } = await program.unsafeRunPromise()

      assert.isTrue(result1 == result)
      assert.isTrue(result2 == result)
      assert.isTrue(result3 == result)
      assert.isTrue(result4 == result)
      assert.isTrue(result5 == result)
    })

    it("returns all elements if chunkSize is greater than the size of the stream", async () => {
      const program = Stream(1, 2, 3, 4, 5).sliding(6).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(Chunk(1, 2, 3, 4, 5)))
    })

    it("is mostly equivalent to Stream.grouped when stepSize and chunkSize are equal", async () => {
      const chunkSize = 10
      const stream = Stream.range(0, 100)
      const program = Effect.struct({
        sliding: stream.sliding(chunkSize, chunkSize).runCollect,
        grouped: stream.grouped(chunkSize).runCollect
      })

      const { grouped, sliding } = await program.unsafeRunPromise()

      assert.isTrue(sliding == grouped)
    })

    it("fails if upstream produces an error", async () => {
      const program = (Stream(1, 2, 3) + Stream.fail("ouch") + Stream(4, 5))
        .sliding(2)
        .runCollect
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })

    it("should return empty chunk when stream is empty", async () => {
      const program = Stream.empty.sliding(2).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.isEmpty)
    })

    it("emits elements properly when a failure occurs", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(Chunk.empty<Chunk<number>>()))
        .bindValue("streamChunks", () => Stream.fromChunks(Chunk(1, 2, 3, 4), Chunk(5, 6, 7), Chunk(8)))
        .bindValue("stream", ({ streamChunks }) => (streamChunks + Stream.fail("ouch")).sliding(3, 3))
        .bind("either", ({ ref, stream }) =>
          stream
            .mapEffect((chunk) => ref.update((_) => _.append(chunk)))
            .runCollect
            .either)
        .bind("result", ({ ref }) => ref.get())

      const { either, result } = await program.unsafeRunPromise()

      assert.isTrue(either == Either.left("ouch"))
      assert.isTrue(
        result == Chunk(
          Chunk(1, 2, 3),
          Chunk(4, 5, 6),
          Chunk(7, 8)
        )
      )
    })
  })
})

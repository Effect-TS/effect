describe.concurrent("Sink", () => {
  describe.concurrent("collectAllWhile", () => {
    it("should collect elements while the specified predicate holds true", () =>
      Do(($) => {
        const sink = Sink.collectAllWhile((n: number) => n < 5)
        const stream = Stream.fromChunks(
          Chunk(3, 4, 5, 6, 7, 2),
          Chunk.empty(),
          Chunk(3, 4, 5, 6, 5, 4, 3, 2),
          Chunk.empty()
        ).transduce(sink)
        const result = $(stream.runCollect)
        const expected = Chunk(
          Chunk(3, 4),
          Chunk.empty<number>(),
          Chunk.empty<number>(),
          Chunk(2, 3, 4),
          Chunk.empty<number>(),
          Chunk.empty<number>(),
          Chunk(4, 3, 2)
        )
        assert.isTrue(result == expected)
      }).unsafeRunPromise())
  })

  describe.concurrent("collectAllWhileEffect", () => {
    it("should collect elements while the specified effectful predicate holds true", () =>
      Do(($) => {
        const sink = Sink.collectAllWhileEffect((n: number) => Effect.sync(n < 5))
        const stream = Stream.fromChunks(
          Chunk(3, 4, 5, 6, 7, 2),
          Chunk.empty(),
          Chunk(3, 4, 5, 6, 5, 4, 3, 2),
          Chunk.empty()
        ).transduce(sink)
        const result = $(stream.runCollect)
        const expected = Chunk(
          Chunk(3, 4),
          Chunk.empty<number>(),
          Chunk.empty<number>(),
          Chunk(2, 3, 4),
          Chunk.empty<number>(),
          Chunk.empty<number>(),
          Chunk(4, 3, 2)
        )
        assert.isTrue(result == expected)
      }).unsafeRunPromise())
  })
})

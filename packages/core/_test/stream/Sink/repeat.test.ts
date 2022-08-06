describe.concurrent("Sink", () => {
  describe.concurrent("repeat", () => {
    it("runs until the source is exhausted", () =>
      Do(($) => {
        const sink = Sink.take<number>(3).repeat
        const stream = Stream.fromChunks(
          Chunk(1, 2),
          Chunk(3, 4, 5),
          Chunk.empty(),
          Chunk(6, 7),
          Chunk(8, 9)
        )
        const result = $(stream.run(sink))
        const expected = Chunk(
          Chunk(1, 2, 3),
          Chunk(4, 5, 6),
          Chunk(7, 8, 9),
          Chunk.empty<number>()
        )
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("combinators", () =>
      Do(($) => {
        const sink = Sink.sum().repeat.map((chunk) => chunk.reduce(0, (a, b) => a + b))
        const stream = Stream.fromChunks(
          Chunk(1, 2),
          Chunk(3, 4, 5),
          Chunk.empty(),
          Chunk(6, 7),
          Chunk(8, 9)
        )
        const result = $(stream.run(sink))
        assert.strictEqual(result, 45)
      }).unsafeRunPromise())

    it("handles errors", () =>
      Do(($) => {
        const sink = Sink.fail(undefined).repeat
        const stream = Stream.fromChunks(Chunk(1, 2))
        const result = $(stream.run(sink).either)
        assert.isTrue(result == Either.left(undefined))
      }).unsafeRunPromise())
  })
})

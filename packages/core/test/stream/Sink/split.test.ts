describe.concurrent("Sink", () => {
  describe.concurrent("splitWhere", () => {
    it("should split a stream on predicate and run each part into the sink", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>().splitWhere((n: number) => n % 2 === 0)
        const stream = Stream(1, 2, 3, 4, 5, 6, 7, 8).via(Stream.$.fromSink(sink))
        const result = $(stream.runCollect)
        const expected = Chunk(Chunk(1), Chunk(2, 3), Chunk(4, 5), Chunk(6, 7), Chunk(8))
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("should split a stream on predicate and run each part into the sink, in several chunks", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>().splitWhere((n: number) => n % 2 === 0)
        const stream = Stream.fromChunks(Chunk(1, 2, 3, 4), Chunk(5, 6, 7, 8))
        const result = $(stream.via(Stream.$.fromSink(sink)).runCollect)
        const expected = Chunk(Chunk(1), Chunk(2, 3), Chunk(4, 5), Chunk(6, 7), Chunk(8))
        assert.isTrue(result == expected)
      }).unsafeRunPromise())

    it("not yield an empty sink if split on the first element", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>().splitWhere((n: number) => n % 2 !== 0)
        const stream = Stream(1, 2, 3, 4, 5, 6, 7, 8).via(Stream.$.fromSink(sink))
        const result = $(stream.runCollect)
        const expected = Chunk(Chunk(1, 2), Chunk(3, 4), Chunk(5, 6), Chunk(7, 8))
        assert.isTrue(result == expected)
      }).unsafeRunPromise())
  })
})

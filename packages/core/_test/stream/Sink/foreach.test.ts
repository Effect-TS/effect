describe.concurrent("Sink", () => {
  describe.concurrent("forEachWhile", () => {
    it("handles leftovers", () =>
      Do(($) => {
        const sink = Sink.forEachWhile((n: number) => Effect.sync(n <= 3)).exposeLeftover
        const stream = Stream.range(1, 6)
        const result = $(stream.run(sink))
        assert.isTrue(result[1] == Chunk(4, 5))
      }).unsafeRunPromise())
  })
})

describe.concurrent("Sink", () => {
  describe.concurrent("filterInput", () => {
    it("should filter input values", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>().filterInput((n) => n % 2 === 0)
        const stream = Stream.range(1, 10)
        const result = $(stream.run(sink))
        assert.isTrue(result == Chunk(2, 4, 6, 8))
      }).unsafeRunPromise())
  })

  describe.concurrent("filterInputEffect", () => {
    it("happy path", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>().filterInputEffect((n) => Effect.sync(n % 2 === 0))
        const stream = Stream.range(1, 10)
        const result = $(stream.run(sink))
        assert.isTrue(result == Chunk(2, 4, 6, 8))
      }).unsafeRunPromise())

    it("failure", () =>
      Do(($) => {
        const sink = Sink.collectAll<number>().filterInputEffect(() =>
          Effect.failSync("fail") as Effect<never, string, boolean>
        )
        const stream = Stream.range(1, 10)
        const result = $(stream.run(sink).flip)
        assert.strictEqual(result, "fail")
      }).unsafeRunPromise())
  })
})

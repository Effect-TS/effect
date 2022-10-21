describe.concurrent("Sink", () => {
  describe.concurrent("as", () => {
    it("should map to the specified value", () =>
      Do(($) => {
        const sink = Sink.succeed(1).as("as")
        const stream = Stream.range(1, 10)
        const result = $(stream.run(sink))
        assert.strictEqual(result, "as")
      }).unsafeRunPromise())
  })

  describe.concurrent("map", () => {
    it("should map values", () =>
      Do(($) => {
        const sink = Sink.succeed(1).map((n) => n.toString())
        const stream = Stream.range(1, 10)
        const result = $(stream.run(sink))
        assert.strictEqual(result, "1")
      }).unsafeRunPromise())
  })

  describe.concurrent("mapError", () => {
    it("should map errors", () =>
      Do(($) => {
        const sink = Sink.failSync("fail").mapError((s) => s + "!")
        const stream = Stream.range(1, 10)
        const result = $(stream.run(sink).either)
        assert.isTrue(result == Either.left("fail!"))
      }).unsafeRunPromise())
  })

  describe.concurrent("mapEffect", () => {
    it("happy path", () =>
      Do(($) => {
        const sink = Sink.succeed(1).mapEffect((n) => Effect.sync(n + 1))
        const stream = Stream.range(1, 10)
        const result = $(stream.run(sink))
        assert.strictEqual(result, 2)
      }).unsafeRunPromise())

    it("failure", () =>
      Do(($) => {
        const sink = Sink.succeed(1).mapEffect(() => Effect.failSync("fail"))
        const stream = Stream.range(1, 10)
        const result = $(stream.run(sink).flip)
        assert.strictEqual(result, "fail")
      }).unsafeRunPromise())
  })
})

describe.concurrent("Sink", () => {
  describe.concurrent("as", () => {
    it("should map to the specified value", async () => {
      const program = Stream.range(1, 10).run(Sink.succeed(1).as("as"))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "as")
    })
  })

  describe.concurrent("map", () => {
    it("should map values", async () => {
      const program = Stream.range(1, 10).run(Sink.succeed(1).map((n) => n.toString()))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "1")
    })
  })

  describe.concurrent("mapError", () => {
    it("should map errors", async () => {
      const program = Stream.range(1, 10)
        .run(Sink.fail("fail").mapError((s) => s + "!"))
        .either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("fail!"))
    })
  })

  describe.concurrent("mapEffect", () => {
    it("happy path", async () => {
      const program = Stream.range(1, 10).run(
        Sink.succeed(1).mapEffect((n) => Effect.sync(n + 1))
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 2)
    })

    it("failure", async () => {
      const program = Stream.range(1, 10)
        .run(Sink.succeed(1).mapEffect(() => Effect.failSync("fail")))
        .flip

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "fail")
    })
  })
})

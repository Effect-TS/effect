describe.concurrent("Sink", () => {
  describe.concurrent("filterInput", () => {
    it("should filter input values", async () => {
      const program = Stream.range(1, 10).run(
        Sink.collectAll<number>().filterInput((n) => n % 2 === 0)
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(2, 4, 6, 8))
    })
  })

  describe.concurrent("filterInputEffect", () => {
    it("happy path", async () => {
      const program = Stream.range(1, 10).run(
        Sink.collectAll<number>().filterInputEffect((n) => Effect.succeed(n % 2 === 0))
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(2, 4, 6, 8))
    })

    it("failure", async () => {
      const program = Stream.range(1, 10)
        .run(
          Sink.collectAll<number>().filterInputEffect(
            () => Effect.fail("fail") as Effect<unknown, string, boolean>
          )
        )
        .flip()

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "fail")
    })
  })
})

describe.concurrent("Sink", () => {
  describe.concurrent("forEachWhile", () => {
    it("handles leftovers", async () => {
      const program = Stream.range(1, 6).run(
        Sink.forEachWhile((n: number) => Effect.succeed(n <= 3)).exposeLeftover
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.get(1) == Chunk(4, 5))
    })
  })
})

describe.concurrent("Sink", () => {
  describe.concurrent("repeat", () => {
    it("runs until the source is exhausted", async () => {
      const program = Stream.fromChunks(
        Chunk(1, 2),
        Chunk(3, 4, 5),
        Chunk.empty(),
        Chunk(6, 7),
        Chunk(8, 9)
      )
        .run(Sink.take<number>(3).repeat())

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Chunk(1, 2, 3),
          Chunk(4, 5, 6),
          Chunk(7, 8, 9),
          Chunk.empty<number>()
        )
      )
    })

    it("combinators", async () => {
      const program = Stream.fromChunks(
        Chunk(1, 2),
        Chunk(3, 4, 5),
        Chunk.empty(),
        Chunk(6, 7),
        Chunk(8, 9)
      ).run(
        Sink.sum()
          .repeat()
          .map((chunk) => chunk.reduce(0, (a, b) => a + b))
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 45)
    })

    it("handles errors", async () => {
      const program = Stream.fromChunks(Chunk(1, 2))
        .run(Sink.fail(undefined).repeat())
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(undefined))
    })
  })
})

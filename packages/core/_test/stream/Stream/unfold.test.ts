describe.concurrent("Stream", () => {
  describe.concurrent("unfold", () => {
    it("simple example", async () => {
      const program =
        Stream.unfold(0, (n) => n < 10 ? Maybe.some(Tuple(n, n + 1)) : Maybe.none).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, 9))
    })
  })

  describe.concurrent("unfoldEffect", () => {
    it("simple example", async () => {
      const program = Stream.unfoldEffect(
        0,
        (n) => n < 10 ? Effect.sync(Maybe.some(Tuple(n, n + 1))) : Effect.none
      )
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, 9))
    })
  })

  describe.concurrent("unfoldChunk", () => {
    it("simple example", async () => {
      const program = Stream.unfoldChunk(
        0,
        (n) => n < 10 ? Maybe.some(Tuple(Chunk(n, n + 1), n + 2)) : Maybe.none
      )
        .runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, 9))
    })
  })

  describe.concurrent("unfoldChunkEffect", () => {
    it("simple example", async () => {
      const program = Stream.unfoldChunkEffect(0, (n) =>
        n < 10
          ? Effect.sync(Maybe.some(Tuple(Chunk(n, n + 1), n + 2)))
          : Effect.none).runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(0, 9))
    })
  })
})

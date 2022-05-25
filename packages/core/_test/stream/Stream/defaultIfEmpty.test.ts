describe.concurrent("Stream", () => {
  describe.concurrent("defaultIfEmpty", () => {
    it("produce default value if stream is empty", async () => {
      const program = Stream.empty.defaultIfEmpty(0).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0))
    })

    it("consume default stream if stream is empty", async () => {
      const program = Stream.empty.defaultIfEmpty(Stream.range(0, 5)).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 2, 3, 4))
    })

    it("ignore default value when stream is not empty", async () => {
      const program = Stream(1).defaultIfEmpty(0).runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1))
    })

    it("should throw correct error from default stream", async () => {
      const program = Stream.empty
        .defaultIfEmpty(Stream.fail("ouch"))
        .runCollect()
        .either()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left("ouch"))
    })
  })
})

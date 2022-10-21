describe.concurrent("Stream", () => {
  describe.concurrent("either", () => {
    it("should convert stream elements to Either", async () => {
      const program = (Stream(1, 2, 3) + Stream.failSync("boom")).either.runCollect

      const result = await program.unsafeRunPromise()

      assert.isTrue(
        result == Chunk(
          Either.right(1),
          Either.right(2),
          Either.right(3),
          Either.left("boom")
        )
      )
    })
  })
})

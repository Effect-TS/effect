describe.concurrent("TArray", () => {
  describe.concurrent("toChunk", () => {
    it("should convert to a chunk", async () => {
      const program = TArray(1, 2, 3, 4)
        .commit()
        .flatMap((tArray) => tArray.toChunk().commit())

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3, 4))
    })
  })
})

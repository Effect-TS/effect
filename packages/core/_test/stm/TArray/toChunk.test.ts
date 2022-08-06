describe.concurrent("TArray", () => {
  describe.concurrent("toChunk", () => {
    it("should convert to a chunk", () =>
      Do(($) => {
        const array = $(TArray(1, 2, 3, 4).commit)
        const result = $(array.toChunk.commit)
        assert.isTrue(result == Chunk(1, 2, 3, 4))
      }).unsafeRunPromise())
  })
})

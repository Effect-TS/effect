describe.concurrent("Stream", () => {
  describe.concurrent("rechunk", () => {
    it("simple example", async () => {
      const chunks = Chunk(Chunk(1, 2), Chunk(3), Chunk.empty<number>(), Chunk(4, 5, 6))
      const program = Stream.fromChunks(...chunks)
        .rechunk(2)
        .mapChunks((chunk) => Chunk(chunk))
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == chunks.flatten.grouped(2))
    })
  })
})

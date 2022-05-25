describe.concurrent("Sink", () => {
  describe.concurrent("take", () => {
    it("should take the specified number of elements", async () => {
      const n = 4
      const chunks = Chunk(Chunk(1, 2, 3), Chunk(4, 5), Chunk(6, 7, 8, 9))
      const program = Effect.scoped(
        Stream.fromChunks(...chunks)
          .peel(Sink.take<number>(n))
          .flatMap(({ tuple: [chunk, stream] }) => stream.runCollect().map((leftover) => Tuple(chunk, leftover)))
      )

      const {
        tuple: [chunk, leftover]
      } = await program.unsafeRunPromise()

      assert.isTrue(chunk == chunks.flatten().take(n))
      assert.isTrue(leftover == chunks.flatten().drop(n))
    })
  })
})

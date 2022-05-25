describe.concurrent("Stream", () => {
  describe.concurrent("scan", () => {
    it("simple example", async () => {
      const program = Stream(1, 2, 3, 4, 5)
        .scan(0, (s, a) => s + a)
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(0, 1, 3, 6, 10, 15))
    })
  })

  describe.concurrent("scanReduce", () => {
    it("simple example", async () => {
      const program = Stream(1, 2, 3, 4, 5)
        .scanReduce((s, a) => s + a)
        .runCollect()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 3, 6, 10, 15))
    })
  })
})

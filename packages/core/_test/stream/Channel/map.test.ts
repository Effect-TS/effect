describe.concurrent("Channel", () => {
  describe.concurrent("map", () => {
    it("map", async () => {
      const program = Channel.sync(1)
        .map((n) => n + 1)
        .runCollect

      const [chunk, z] = await program.unsafeRunPromise()

      assert.isTrue(chunk.isEmpty)
      assert.strictEqual(z, 2)
    })
  })
})

describe.concurrent("Channel", () => {
  describe.concurrent("flatMap", () => {
    it("simple", async () => {
      const program = Channel.Do()
        .bind("x", () => Channel.sync(1))
        .bind("y", ({ x }) => Channel.sync(x * 2))
        .bind("z", ({ x, y }) => Channel.sync(x + y))
        .map(({ x, y, z }) => x + y + z)
        .runCollect

      const [chunk, z] = await program.unsafeRunPromise()

      assert.isTrue(chunk.isEmpty)
      assert.strictEqual(z, 6)
    })

    it("structure confusion", async () => {
      const program = Channel.write(Chunk(1, 2))
        .concatMap((chunk) => Channel.writeAll(chunk))
        .zipRight(Channel.failSync("hello"))
        .runDrain

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail("hello"))
    })
  })
})

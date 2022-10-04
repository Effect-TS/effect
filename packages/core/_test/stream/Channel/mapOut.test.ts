describe.concurrent("Channel", () => {
  describe.concurrent("mapOut", () => {
    it("simple", async () => {
      const program = Channel.writeAll(1, 2, 3)
        .mapOut((n) => n + 1)
        .runCollect

      const [chunk, z] = await program.unsafeRunPromise()

      assert.isTrue(chunk == Chunk(2, 3, 4))
      assert.isUndefined(z)
    })

    it("mixed with flatMap", async () => {
      const program = Channel.write(1)
        .mapOut((n) => n.toString())
        .flatMap(() => Channel.write("x"))
        .runCollect
        .map((tuple) => tuple[0])

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("1", "x"))
    })
  })
})

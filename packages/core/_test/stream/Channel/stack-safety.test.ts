describe.concurrent("Channel", () => {
  describe.concurrent("stack safety", () => {
    it("mapOut is stack safe", async () => {
      const N = 10_000

      const program = Chunk.range(1, N)
        .reduce(Channel.write<number>(1), (channel, n) => channel.mapOut((_) => _ + n))
        .runCollect

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      assert.strictEqual(chunk.unsafeHead, Chunk.range(1, N).reduce(1, (a, b) => a + b))
    })

    it("concatMap is stack safe", async () => {
      const N = 10_000

      const program = Chunk.range(1, N)
        .reduce(
          Channel.write<number>(1),
          (channel, n) => channel.concatMap(() => Channel.write(n)).unit
        )
        .runCollect

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      assert.strictEqual(chunk.unsafeHead, N)
    })

    it("flatMap is stack safe", async () => {
      const N = 10_000

      const program = Chunk.range(1, N)
        .reduce(Channel.write<number>(0), (channel, n) => channel.flatMap(() => Channel.write(n)))
        .runCollect

      const {
        tuple: [chunk, _]
      } = await program.unsafeRunPromise()

      assert.isTrue(chunk == Chunk.range(0, N))
    })
  })
})

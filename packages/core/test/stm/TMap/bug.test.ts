describe.concurrent("TMap", () => {
  describe.concurrent("bug #4648", () => {
    it("avoid NullPointerException caused by race condition", async () => {
      const tx = Do(($) => {
        const keys = $(Effect.sync(Chunk.fill(10, identity)))
        const map = $(TMap.fromIterable(keys.zipWithIndex).commit)
        const exit = $(
          Effect.forEachDiscard(keys, (k) =>
            Do((_$) => {
              $(map.delete(k).commit.fork)
              $(map.toChunk.commit)
            })).exit
        )

        return exit.isSuccess()
      })
      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

describe.concurrent("TMap", () => {
  describe.concurrent("folds", () => {
    it("fold on non-empty map", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(["a", 1] as const, ["b", 2] as const, ["c", 3] as const))
        const res = $(tmap.fold(0, (acc, kv) => acc + kv[1]))

        return res === 6
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("fold on empty map", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.empty<string, number>())
        const res = $(tmap.fold(0, (acc, kv) => acc + kv[1]))

        return res === 0
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("foldSTM on non-empty map", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(["a", 1] as const, ["b", 2] as const, ["c", 3] as const))
        const res = $(tmap.foldSTM(0, (acc, kv) => STM.succeed(acc + kv[1])))

        return res === 6
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("foldSTM on empty map", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.empty<string, number>())
        const res = $(tmap.foldSTM(0, (acc, kv) => STM.succeed(acc + kv[1])))

        return res === 0
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

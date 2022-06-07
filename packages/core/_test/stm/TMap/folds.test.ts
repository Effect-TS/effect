describe.concurrent("TMap", () => {
  describe.concurrent("folds", () => {
    it("fold on non-empty map", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("b", 2), Tuple("c", 3)))
        const res = $(tmap.fold(0, (acc, kv) => acc + kv.get(1)))

        return res === 6
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("fold on empty map", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.empty<string, number>())
        const res = $(tmap.fold(0, (acc, kv) => acc + kv.get(1)))

        return res === 0
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("foldSTM on non-empty map", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("b", 2), Tuple("c", 3)))
        const res = $(tmap.foldSTM(0, (acc, kv) => STM.succeed(acc + kv.get(1))))

        return res === 6
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("foldSTM on empty map", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.empty<string, number>())
        const res = $(tmap.foldSTM(0, (acc, kv) => STM.succeed(acc + kv.get(1))))

        return res === 0
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

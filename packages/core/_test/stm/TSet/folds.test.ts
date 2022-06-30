describe.concurrent("TSet", () => {
  describe.concurrent("folds", () => {
    it("fold on non-empty set", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make(1, 2, 3))
        const res = $(tset.fold(0, (acc, a) => acc + a))

        return res === 6
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("fold on empty set", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.empty<number>())
        const res = $(tset.fold(0, (acc, a) => acc + a))

        return res === 0
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("fold on non-empty set", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make(1, 2, 3))
        const res = $(tset.foldSTM(0, (acc, a) => STM.succeed(acc + a)))

        return res === 6
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("fold on empty set", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.empty<number>())
        const res = $(tset.foldSTM(0, (acc, a) => STM.succeed(acc + a)))

        return res === 0
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("toSet", async () => {
      const elems = HashSet([1, 2, 3])
      const tx = Do(($) => {
        const tset = $(TSet.fromIterable(elems))
        const res = $(tset.toHashSet)

        return res == elems
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

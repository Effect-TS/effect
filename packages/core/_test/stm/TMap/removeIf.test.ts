describe.concurrent("TMap", () => {
  describe.concurrent("removeIf", () => {
    it("removeIf", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))
        const removed = $(tmap.removeIf((kv) => kv.get(1) > 1))
        const a = $(tmap.contains("a"))
        const aa = $(tmap.contains("aa"))
        const aaa = $(tmap.contains("aaa"))

        return a === true && aa === false && aaa === false &&
          removed.corresponds(
            Chunk(Tuple("aaa", 3), Tuple("aa", 2)),
            Equivalence.tuple(Equivalence.string, Equivalence.number).equals
          )
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("removeIfDiscard", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))
        $(tmap.removeIfDiscard((kv) => Equals.equals(kv.get(0), "aa")))
        const a = $(tmap.contains("a"))
        const aa = $(tmap.contains("aa"))
        const aaa = $(tmap.contains("aaa"))

        return a === true && aa === false && aaa === true
      })

      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

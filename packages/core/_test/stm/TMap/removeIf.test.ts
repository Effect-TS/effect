describe.concurrent("TMap", () => {
  describe.concurrent("removeIf", () => {
    it("removeIf", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(["a", 1] as const, ["aa", 2] as const, ["aaa", 3] as const))
        const removed = $(tmap.removeIf((kv) => kv[1] > 1))
        const a = $(tmap.contains("a"))
        const aa = $(tmap.contains("aa"))
        const aaa = $(tmap.contains("aaa"))

        return a === true && aa === false && aaa === false &&
          removed.corresponds(
            Chunk(["aaa", 3] as const, ["aa", 2] as const),
            Equivalence.tuple(Equivalence.string, Equivalence.number).equals
          )
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("removeIfDiscard", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(["a", 1] as const, ["aa", 2] as const, ["aaa", 3] as const))
        $(tmap.removeIfDiscard((kv) => Equals.equals(kv[0], "aa")))
        const a = $(tmap.contains("a"))
        const aa = $(tmap.contains("aa"))
        const aaa = $(tmap.contains("aaa"))

        return a === true && aa === false && aaa === true
      })

      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

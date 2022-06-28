describe.concurrent("TMap", () => {
  describe.concurrent("retainIf", () => {
    it("retainIf", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))
        const removed = $(tmap.retainIf((kv) => Equals.equals(kv.get(0), "aa")))
        const a = $(tmap.contains("a"))
        const aa = $(tmap.contains("aa"))
        const aaa = $(tmap.contains("aaa"))

        return a === false && aa === true && aaa === false &&
          removed.corresponds(
            Chunk(Tuple("aaa", 3), Tuple("a", 1)),
            Equivalence.tuple(Equivalence.string, Equivalence.number).equals
          )
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("retainIfDiscard", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))
        $(tmap.retainIfDiscard((kv) => Equals.equals(kv.get(0), "aa")))
        const a = $(tmap.contains("a"))
        const aa = $(tmap.contains("aa"))
        const aaa = $(tmap.contains("aaa"))

        return a === false && aa === true && aaa === false
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

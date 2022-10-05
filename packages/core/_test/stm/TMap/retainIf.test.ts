describe.concurrent("TMap", () => {
  describe.concurrent("retainIf", () => {
    it("retainIf", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(["a", 1] as const, ["aa", 2] as const, ["aaa", 3] as const))
        const removed = $(tmap.retainIf((kv) => Equals.equals(kv[0], "aa")))
        const a = $(tmap.contains("a"))
        const aa = $(tmap.contains("aa"))
        const aaa = $(tmap.contains("aaa"))

        return a === false && aa === true && aaa === false &&
          removed.corresponds(
            Chunk(["aaa", 3] as const, ["a", 1] as const),
            Equivalence.tuple(Equivalence.string, Equivalence.number).equals
          )
      })
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("retainIfDiscard", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(["a", 1] as const, ["aa", 2] as const, ["aaa", 3] as const))
        $(tmap.retainIfDiscard((kv) => Equals.equals(kv[0], "aa")))
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

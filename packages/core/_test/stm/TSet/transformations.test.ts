import { hasSameElements } from "@effect/core/test/stm/TSet/test-utils"

describe.concurrent("TSet", () => {
  describe.concurrent("transformations", () => {
    it("retainIf", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make("a", "aa", "aaa"))
        const removed = $(tset.retainIf((_) => _ === "aa"))
        const a = $(tset.contains("a"))
        const aa = $(tset.contains("aa"))
        const aaa = $(tset.contains("aaa"))

        return removed == Chunk("aaa", "a") && a === false && aa === true && aaa === false
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("retainIfDiscard", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make("a", "aa", "aaa"))

        $(tset.retainIfDiscard((_) => _ === "aa"))

        const a = $(tset.contains("a"))
        const aa = $(tset.contains("aa"))
        const aaa = $(tset.contains("aaa"))

        return a === false && aa === true && aaa === false
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("removeIf", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make("a", "aa", "aaa"))
        const removed = $(tset.removeIf((_) => _ === "aa"))
        const a = $(tset.contains("a"))
        const aa = $(tset.contains("aa"))
        const aaa = $(tset.contains("aaa"))

        return removed == Chunk("aa") && a === true && aa === false && aaa === true
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("removeIfDiscard", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make("a", "aa", "aaa"))

        $(tset.removeIfDiscard((_) => _ === "aa"))

        const a = $(tset.contains("a"))
        const aa = $(tset.contains("aa"))
        const aaa = $(tset.contains("aaa"))

        return a === true && aa === false && aaa === true
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transform", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make(1, 2, 3))

        $(tset.transform((_) => _ * 2))

        const res = $(tset.toList)

        return hasSameElements(res, Equivalence.number, List(2, 4, 6))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transform and shrink", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make(1, 2, 3))

        $(tset.transform((_) => 1))

        const res = $(tset.toList)

        return hasSameElements(res, Equivalence.number, List(1))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transformSTM", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make(1, 2, 3))

        $(tset.transformSTM((_) => STM.succeed(_ * 2)))

        const res = $(tset.toList)

        return hasSameElements(res, Equivalence.number, List(2, 4, 6))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transformSTM and shrink", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make(1, 2, 3))

        $(tset.transformSTM((_) => STM.succeed(1)))

        const res = $(tset.toList)

        return hasSameElements(res, Equivalence.number, List(1))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

import { hasSameElements } from "@effect/core/test/stm/TSet/test-utils"

describe.concurrent("TSet", () => {
  describe.concurrent("set operations", () => {
    it("diff", async () => {
      const tx = Do(($) => {
        const tset1 = $(TSet.make(1, 2, 3))
        const tset2 = $(TSet.make(1, 4, 5))

        $(tset1.diff(tset2))

        const res = $(tset1.toList)

        return hasSameElements(res, Equivalence.number, List(2, 3))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("intersect", async () => {
      const tx = Do(($) => {
        const tset1 = $(TSet.make(1, 2, 3))
        const tset2 = $(TSet.make(1, 4, 5))

        $(tset1.intersect(tset2))

        const res = $(tset1.toList)

        return hasSameElements(res, Equivalence.number, List(1))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("union", async () => {
      const tx = Do(($) => {
        const tset1 = $(TSet.make(1, 2, 3))
        const tset2 = $(TSet.make(1, 4, 5))

        $(tset1.union(tset2))

        const res = $(tset1.toList)

        return hasSameElements(res, Equivalence.number, List(1, 2, 3, 4, 5))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

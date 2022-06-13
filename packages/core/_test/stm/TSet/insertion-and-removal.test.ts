import { hasSameElements } from "@effect/core/test/stm/TSet/test-utils"

describe.concurrent("TSet", () => {
  describe.concurrent("insertion and removal", () => {
    it("add new element", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.empty<number>())

        $(tset.put(1))

        const res = $(tset.toList)

        return hasSameElements(res, Equivalence.number, List(1))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("add duplicate element", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make(1))

        $(tset.put(1))

        const res = $(tset.toList)

        return hasSameElements(res, Equivalence.number, List(1))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("remove existing element", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make(1, 2))

        $(tset.delete(1))

        const res = $(tset.toList)

        return hasSameElements(res, Equivalence.number, List(2))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("remove non-existing element", async () => {
      const tx = Do(($) => {
        const tset = $(TSet.make(1, 2))

        $(tset.delete(3))

        const res = $(tset.toList)

        return hasSameElements(res, Equivalence.number, List(1, 2))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

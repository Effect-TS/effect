import { hasSameElements } from "@effect/core/test/stm/TSet/test-utils"

describe.concurrent("TSet", () => {
  describe.concurrent("lookups", () => {
    it("contains existing element", async () => {
      const tx = TSet.make(1, 2, 3, 4).flatMap((_) => _.contains(1))
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("contains non-existing element", async () => {
      const tx = TSet.make(1, 2, 3, 4).flatMap((_) => _.contains(0))
      const result = await tx.commit().unsafeRunPromise()

      assert.isFalse(result)
    })
    it("collect all elements", async () => {
      const tx = TSet.make(1, 2, 3, 4).flatMap((_) => _.toList).map((_) =>
        hasSameElements(_, Equivalence.number, List(1, 2, 3, 4))
      )
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("cardinality", async () => {
      const tx = TSet.make(1, 2, 3, 4).flatMap((_) => _.size).map((_) => _ == 4)
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

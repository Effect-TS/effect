import { hasSameElements } from "@effect/core/test/stm/TSet/test-utils"

describe.concurrent("TSet", () => {
  describe.concurrent("factories", () => {
    it("apply", async () => {
      const tx = TSet.make(1, 2, 2, 3).flatMap((
        _
      ) => _.toList).map((_) =>
        hasSameElements(
          _,
          Equivalence.number,
          List(1, 2, 3)
        )
      )
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("empty", async () => {
      const tx = TSet.empty().flatMap((_) => _.toList).map((_) => _.isNil())
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("fromIterable", async () => {
      const tx = TSet.fromIterable(List(1, 2, 2, 3))
        .flatMap((_) => _.toList).map((_) =>
          hasSameElements(
            _,
            Equivalence.number,
            List(1, 2, 3)
          )
        )
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

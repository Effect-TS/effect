import { hasSameElements } from "@effect/core/test/stm/TMap/test-utils"

describe.concurrent("TMap", () => {
  describe.concurrent("factories", () => {
    it("apply", async () => {
      const tx = TMap.make(
        Tuple("a", 1),
        Tuple("b", 2),
        Tuple("c", 2),
        Tuple("b", 3)
      )
        .flatMap((_) => _.toList)
        .map((_) =>
          hasSameElements(
            _,
            Equivalence.tuple(Equivalence.string, Equivalence.number),
            List(Tuple("a", 1), Tuple("b", 3), Tuple("c", 2))
          )
        )
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("empty", async () => {
      const tx = TMap.empty().flatMap((_) => _.toList).map((_) => _.isNil())
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("fromIterable", async () => {
      const tx = TMap.fromIterable([
        Tuple("a", 1),
        Tuple("b", 2),
        Tuple("c", 2),
        Tuple("b", 3)
      ])
        .flatMap((_) => _.toList).map((_) =>
          hasSameElements(
            _,
            Equivalence.tuple(Equivalence.string, Equivalence.number),
            List(Tuple("a", 1), Tuple("c", 2), Tuple("b", 3))
          )
        )
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

import { hasSameElements } from "@effect/core/test/stm/TMap/test-utils"

describe.concurrent("TMap", () => {
  describe.concurrent("factories", () => {
    it("apply", async () => {
      const tx = TMap.make(
        ["a", 1] as const,
        ["b", 2] as const,
        ["c", 2] as const,
        ["b", 3] as const
      )
        .flatMap((_) => _.toList)
        .map((_) =>
          hasSameElements(
            _,
            Equivalence.tuple(Equivalence.string, Equivalence.number),
            List(["a", 1] as const, ["b", 3] as const, ["c", 2] as const)
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
        ["a", 1] as const,
        ["b", 2] as const,
        ["c", 2] as const,
        ["b", 3] as const
      ])
        .flatMap((_) => _.toList).map((_) =>
          hasSameElements(
            _,
            Equivalence.tuple(Equivalence.string, Equivalence.number),
            List(["a", 1] as const, ["c", 2] as const, ["b", 3] as const)
          )
        )
      const result = await tx.commit.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

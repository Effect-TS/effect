import { hasSameElements } from "@effect/core/test/stm/TMap/test-utils"

describe.concurrent("TMap", () => {
  describe.concurrent("lookups", () => {
    it("get existing element", async () => {
      const tx = TMap.make(Tuple.make("a", 1), Tuple.make("b", 2)).flatMap((_) => _.get("a")).map((_) =>
        _ == Maybe.some(1)
      )
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("get non-existing element", async () => {
      const tx = TMap.empty<string, number>().flatMap((_) => _.get("a")).map((_) => _.isNone())
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("getOrElse existing element", async () => {
      const tx = TMap.make(Tuple.make("a", 1), Tuple.make("b", 2)).flatMap((_) => _.getOrElse("a", 10)).map((_) =>
        _ === 1
      )
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("getOrElse non-existing element", async () => {
      const tx = TMap.empty<string, number>().flatMap((_) => _.getOrElse("a", 10)).map((_) => _ === 10)
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("contains existing element", async () => {
      const tx = TMap.make(Tuple.make("a", 1), Tuple.make("b", 2)).flatMap((_) => _.contains("a"))
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("contains non-existing element", async () => {
      const tx = TMap.empty().flatMap((_) => _.contains("a"))
      const result = await tx.commit().unsafeRunPromise()

      assert.isFalse(result)
    })
    it("collect all elements", async () => {
      const tx = TMap.make(Tuple.make("a", 1), Tuple.make("b", 2), Tuple.make("c", 3)).flatMap((_) =>
        _.toList.map((_) =>
          hasSameElements(
            _,
            Equivalence.tuple(Equivalence.string, Equivalence.number),
            List(Tuple.make("a", 1), Tuple.make("c", 3), Tuple.make("b", 2))
          )
        )
      )
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("collect all keys", async () => {
      const tx = TMap.make(Tuple.make("a", 1), Tuple.make("b", 2), Tuple.make("c", 3)).flatMap((_) =>
        _.keys.map((_) =>
          hasSameElements(
            _,
            Equivalence.string,
            List("a", "b", "c")
          )
        )
      )
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("collect all values", async () => {
      const tx = TMap.make(Tuple.make("a", 1), Tuple.make("b", 2), Tuple.make("c", 3)).flatMap((_) =>
        _.values.map((_) =>
          hasSameElements(
            _,
            Equivalence.number,
            List(1, 2, 3)
          )
        )
      )
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

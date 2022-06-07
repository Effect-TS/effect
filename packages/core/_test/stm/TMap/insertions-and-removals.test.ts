import { HashContainer, hasSameElements } from "@effect/core/test/stm/TMap/test-utils"

describe.concurrent("TMap", () => {
  describe.concurrent("insertion and removal", () => {
    it("add new element", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.empty<string, number>())

        $(tmap.put("a", 1))

        const e = $(tmap.get("a"))

        return e == Option.some(1)
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("overwrite existing element", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("b", 2)))

        $(tmap.put("a", 10))

        const e = $(tmap.get("a"))

        return e == Option.some(10)
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("remove existing element", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("b", 2)))

        $(tmap.delete("a"))

        const e = $(tmap.get("a"))

        return e.isNone()
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("remove non-existing element", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.empty<string, number>())

        $(tmap.delete("a"))

        const e = $(tmap.get("a"))

        return e.isNone()
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("add many keys with negative hash codes", async () => {
      const expected = Chunk.fill(1000, (i) => Tuple(new HashContainer(-i), i)).asList()
      const tx = Do(($) => {
        const tmap = $(TMap.empty<HashContainer, number>())

        $(STM.collectAll(expected.map((i) => tmap.put(i.get(0), i.get(1)))))

        const e = $(tmap.toList())

        return hasSameElements(e, Equivalence(Equals.equals), expected)
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("putIfAbsent", async () => {
      const expected = List(Tuple("a", 1), Tuple("b", 2))
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1)))

        $(tmap.putIfAbsent("b", 2))
        $(tmap.putIfAbsent("a", 10))

        const e = $(tmap.toList())

        return hasSameElements(e, Equivalence(Equals.equals), expected)
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

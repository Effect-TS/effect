import { HashContainer, hasSameElements } from "@effect/core/test/stm/TMap/test-utils"

describe.concurrent("TMap", () => {
  describe.concurrent("transformations", () => {
    it("size", async () => {
      const elems = List(Tuple("a", 1), Tuple("b", 2))
      const tx = Do(($) => {
        const tmap = $(TMap.fromIterable(elems))
        const size = $(tmap.size)

        return size === 2
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("toList", async () => {
      const elems = List(Tuple("a", 1), Tuple("b", 2))
      const tx = Do(($) => {
        const tmap = $(TMap.fromIterable(elems))
        const list = $(tmap.toList)

        return hasSameElements(list, Equivalence.tuple(Equivalence.string, Equivalence.number), elems)
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("toChunk", async () => {
      const elems = List(Tuple("a", 1), Tuple("b", 2))
      const tx = Do(($) => {
        const tmap = $(TMap.fromIterable(elems))
        const chunk = $(tmap.toChunk)

        return hasSameElements(chunk.asList(), Equivalence.tuple(Equivalence.string, Equivalence.number), elems)
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("toMap", async () => {
      const elems = new Map<string, number>([["a", 1], ["b", 2]])
      const tx = Do(($) => {
        const tmap = $(TMap.fromIterable(Chunk.from(elems).map(Tuple.fromNative)))
        const map = $(tmap.toMap.map(Chunk.from).map((_) => _.map(Tuple.fromNative)))

        return hasSameElements(
          map,
          Equivalence.tuple(Equivalence.string, Equivalence.number),
          Chunk.from(elems).map(Tuple.fromNative)
        )
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("merge", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1)))
        const a = $(tmap.merge("a", 2, (_) => _.get(0) + _.get(1)))
        const b = $(tmap.merge("b", 2, (_) => _.get(0) + _.get(1)))

        return a === 3 && b === 2
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transform", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))

        $(tmap.transform((kv) => Tuple(kv.get(0).replaceAll("a", "b"), kv.get(1) * 2)))

        const res = $(tmap.toList)

        return hasSameElements(
          res,
          Equivalence.tuple(Equivalence.string, Equivalence.number),
          List(Tuple("b", 2), Tuple("bb", 4), Tuple("bbb", 6))
        )
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transform with keys with negative hash codes", async () => {
      const tx = Do(($) => {
        const tmap = $(
          TMap.make(Tuple(new HashContainer(-1), 1), Tuple(new HashContainer(-2), 2), Tuple(new HashContainer(-3), 3))
        )

        $(tmap.transform((kv) => Tuple(new HashContainer(kv.get(0).i * -2), kv.get(1) * 2)))

        const res = $(tmap.toList)

        return hasSameElements(
          res,
          Equivalence.tuple(Equivalence(Equals.equals), Equivalence.number),
          List(Tuple(new HashContainer(2), 2), Tuple(new HashContainer(4), 4), Tuple(new HashContainer(6), 6))
        )
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transform and shrink", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))

        $(tmap.transform((kv) => Tuple("key", kv.get(1) * 2)))

        const res = $(tmap.toList)

        return hasSameElements(res, Equivalence.tuple(Equivalence.string, Equivalence.number), List(Tuple("key", 6)))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transformSTM", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))

        $(tmap.transformSTM((kv) => STM.succeed(Tuple(kv.get(0).replaceAll("a", "b"), kv.get(1) * 2))))

        const res = $(tmap.toList)

        return hasSameElements(
          res,
          Equivalence.tuple(Equivalence.string, Equivalence.number),
          List(Tuple("b", 2), Tuple("bb", 4), Tuple("bbb", 6))
        )
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transformSTM and shrink", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))

        $(tmap.transformSTM((kv) => STM.succeed(Tuple("key", kv.get(1) * 2))))

        const res = $(tmap.toList)

        return hasSameElements(res, Equivalence.tuple(Equivalence.string, Equivalence.number), List(Tuple("key", 6)))
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transformValues", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))

        $(tmap.transformValues((v) => v * 2))

        const res = $(tmap.toList)

        return hasSameElements(
          res,
          Equivalence.tuple(Equivalence.string, Equivalence.number),
          List(Tuple("a", 2), Tuple("aa", 4), Tuple("aaa", 6))
        )
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("parallel value transformation", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 0)).commit())

        const transformation = tmap.transformValues((v) => v + 1).commit().repeatN(999)

        const n = 2

        $(Effect.collectAllParDiscard(Chunk.fill(n, () => transformation)))

        const res = $(tmap.get("a").commit())

        return res == Option.some(2000)
      })
      const result = await tx.unsafeRunPromise()

      assert.isTrue(result)
    })
    it("transformValuesSTM", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("aa", 2), Tuple("aaa", 3)))

        $(tmap.transformValuesSTM((v) => STM.succeed(v * 2)))

        const res = $(tmap.toList)

        return hasSameElements(
          res,
          Equivalence.tuple(Equivalence.string, Equivalence.number),
          List(Tuple("a", 2), Tuple("aa", 4), Tuple("aaa", 6))
        )
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
    it("updateWith", async () => {
      const tx = Do(($) => {
        const tmap = $(TMap.make(Tuple("a", 1), Tuple("b", 2)))

        $(tmap.updateWith("a", (v) => v.map((_) => _ + 1)))
        $(tmap.updateWith("b", (v) => Option.none))
        $(tmap.updateWith("c", (v) => Option.some(3)))
        $(tmap.updateWith("d", (v) => Option.none))

        const res = $(tmap.toMap.map(Chunk.from).map((_) => _.map(Tuple.fromNative)))

        return hasSameElements(
          res,
          Equivalence.tuple(Equivalence.string, Equivalence.number),
          Chunk.from(new Map([["a", 2], ["c", 3]])).map(Tuple.fromNative)
        )
      })
      const result = await tx.commit().unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

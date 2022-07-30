import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("STM", () => {
  describe.concurrent("collectAll", () => {
    // TODO: implement after TQueue
    it.skip("ordering", async () => {
      // val tx = for {
      //   tq  <- TQueue.bounded[Int](3)
      //   _   <- tq.offer(1)
      //   _   <- tq.offer(2)
      //   _   <- tq.offer(3)
      //   ans <- ZSTM.collectAll(List(tq.take, tq.take, tq.take))
      // } yield ans
      // assertM(tx.commit)(equalTo(List(1, 2, 3)))
    })

    it("collects a list of transactional effects to a single transaction that produces a list of values", async () => {
      const program = Effect.Do()
        .bind("iterable", () => Effect.sync(Chunk.range(1, 100).map((n) => TRef.make(n))))
        .bind("tRefs", ({ iterable }) => STM.collectAll(iterable).commit)
        .flatMap(({ tRefs }) => Effect.forEachPar(tRefs, (tRef) => tRef.get.commit))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(1, 100))
    })

    it("collects a chunk of transactional effects to a single transaction that produces a chunk of values", async () => {
      const program = Effect.Do()
        .bind("iterable", () => Effect.sync(Chunk.range(1, 100).map((n) => TRef.make(n))))
        .bind("tRefs", ({ iterable }) => STM.collectAll(Chunk.from(iterable)).commit)
        .flatMap(({ tRefs }) => Effect.forEachPar(tRefs, (tRef) => tRef.get.commit))

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.range(1, 100))
    })
  })

  describe.concurrent("mergeAll", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42
      const nonZero = 43
      const program = STM.mergeAll(
        List.empty<STM<never, never, number>>(),
        zeroElement,
        () => nonZero
      ).commit

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, zeroElement)
    })

    it("merge list using function", async () => {
      const program = STM.mergeAll(
        List(3, 5, 7).map(STM.succeedNow),
        1,
        (a, b) => a + b
      ).commit

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1 + 3 + 5 + 7)
    })
    it("return error if it exists in list", async () => {
      const program = STM.mergeAll(
        List(STM.unit, STM.fail(1)),
        undefined,
        constVoid
      ).commit

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail(1))
    })
  })
  describe.concurrent("reduceAll", () => {
    it("should reduce all elements to a single value", async () => {
      const program = STM.reduceAll(
        STM.succeed(1),
        List(2, 3, 4).map(STM.succeedNow),
        (acc, a) => acc + a
      ).commit

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 10)
    })

    it("should handle an empty iterable", async () => {
      const program = STM.reduceAll(
        STM.succeed(1),
        List.empty<STM<never, never, number>>(),
        (acc, a) => acc + a
      ).commit

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })
})

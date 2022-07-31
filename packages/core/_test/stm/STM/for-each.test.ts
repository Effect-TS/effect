describe.concurrent("STM", () => {
  describe.concurrent("forEach", () => {
    it("performs an action on each list element and return a single transaction that contains the result", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .tap(({ tRef }) => STM.forEach(list, (n) => tRef.update((_) => _ + n)).commit)
        .flatMap(({ tRef }) => tRef.get.commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, list.reduce(0, (acc, n) => acc + n))
    })

    it("performs an action on each chunk element and return a single transaction that contains the result", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .tap(({ tRef }) => STM.forEach(chunk, (n) => tRef.update((_) => _ + n)).commit)
        .flatMap(({ tRef }) => tRef.get.commit)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, chunk.reduce(0, (acc, n) => acc + n))
    })
  })

  describe.concurrent("forEachDiscard", () => {
    it("performs actions in order given a list", async () => {
      const input = Chunk(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(Chunk.empty<number>()))
        .tap(({ tRef }) =>
          STM.forEach(input, (n) => tRef.update((chunk) => chunk.append(n))).commit
        )
        .flatMap(({ tRef }) => tRef.get.commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == input)
    })

    it("performs actions in order given a chunk", async () => {
      const input = List(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit<List<number>>(List.empty()))
        .tap(({ tRef }) => STM.forEach(input, (n) => tRef.update((list) => list.prepend(n))).commit)
        .flatMap(({ tRef }) => tRef.get.map((list) => list.reverse).commit)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == input)
    })
  })

  describe.concurrent("collectAll", () => {
    // TODO: implement after TQueue
    it.skip("correct ordering", async () => {
      // val tx = for {
      //   tq  <- TQueue.bounded[Int](3)
      //   _   <- tq.offer(1)
      //   _   <- tq.offer(2)
      //   _   <- tq.offer(3)
      //   ans <- ZSTM.collectAll(List(tq.take, tq.take, tq.take))
      // } yield ans
      // assertM(tx.commit)(equalTo(List(1, 2, 3)))
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
        () => undefined
      ).commit

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(1))
    })
  })
})

describe.concurrent("Effect", () => {
  describe.concurrent("collectAllPar", () => {
    it("returns the list in the same order", async () => {
      const list = List(1, 2, 3).map((n) => Effect.succeed(n))
      const program = Effect.collectAllPar(list)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })

    it("is referentially transparent", async () => {
      const program = Effect.Do()
        .bind("counter", () => Ref.make(0))
        .bindValue("op", ({ counter }) => counter.getAndUpdate((n) => n + 1))
        .bindValue("ops3", ({ op }) => Effect.collectAllPar(List(op, op, op)))
        .bindValue("ops6", ({ ops3 }) => ops3.zipPar(ops3))
        .flatMap(({ ops6 }) => ops6)

      const result = await program.unsafeRunPromise()

      assert.isFalse(result.get(0) == result.get(1))
    })
  })

  describe.concurrent("collectAllPar - parallelism", () => {
    it("returns results in the same order", async () => {
      const list = List(1, 2, 3).map((n) => Effect.succeed(n))
      const program = Effect.collectAllPar(list)
        .withParallelism(2)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk(1, 2, 3))
    })
  })

  describe.concurrent("collectAllParDiscard - parallelism", () => {
    it("preserves failures", async () => {
      const chunk = Chunk.fill(10, () => Effect.fail(new RuntimeError()))
      const program = Effect.collectAllParDiscard(chunk).withParallelism(5).flip()

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, new RuntimeError())
    })
  })

  describe.concurrent("collectFirst", () => {
    it("collects the first value for which the effectual function returns Some", async () => {
      const program = Effect.collectFirst(
        Chunk.range(0, 10),
        (n) => n > 5 ? Effect.succeed(Option.some(n)) : Effect.succeed(Option.none)
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Option.some(6))
    })
  })
})

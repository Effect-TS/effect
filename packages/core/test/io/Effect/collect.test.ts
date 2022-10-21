describe.concurrent("Effect", () => {
  describe.concurrent("collectAllPar", () => {
    it("returns the list in the same order", () =>
      Do(($) => {
        const list = List(1, 2, 3).map(Effect.succeed)
        const result = $(Effect.collectAllPar(list))
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())

    it("is referentially transparent", () =>
      Do(($) => {
        const counter = $(Ref.make(0))
        const op = counter.getAndUpdate((n) => n + 1)
        const ops3 = Effect.collectAllPar(List(op, op, op))
        const result = $(ops3.zipPar(ops3))
        assert.isFalse(result[0] == result[1])
      }).unsafeRunPromise())
  })

  describe.concurrent("collectAllPar - parallelism", () => {
    it("returns results in the same order", () =>
      Do(($) => {
        const list = List(1, 2, 3).map(Effect.succeed)
        const result = $(Effect.collectAllPar(list).withParallelism(2))
        assert.isTrue(result == Chunk(1, 2, 3))
      }).unsafeRunPromise())
  })

  describe.concurrent("collectAllParDiscard - parallelism", () => {
    it("preserves failures", () =>
      Do(($) => {
        const chunk = Chunk.fill(10, () => Effect.failSync(new RuntimeError()))
        const result = $(Effect.collectAllParDiscard(chunk).withParallelism(5).flip)
        assert.deepEqual(result, new RuntimeError())
      }).unsafeRunPromise())
  })

  describe.concurrent("collectFirst", () => {
    it("collects the first value for which the effectual function returns Some", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 10)
        const result = $(
          Effect.collectFirst(chunk, (n) =>
            n > 5 ?
              Effect.succeed(Maybe.some(n)) :
              Effect.succeed(Maybe.none))
        )
        assert.isTrue(result == Maybe.some(6))
      }).unsafeRunPromise())
  })
})

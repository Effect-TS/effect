describe.concurrent("Effect", () => {
  describe.concurrent("partition", () => {
    it("collects only successes", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 9)
        const result = $(Effect.partition(chunk, (n) => Effect.sync(n)))
        const { tuple: [left, right] } = result
        assert.isTrue(left == Chunk.empty())
        assert.isTrue(right == chunk)
      }).unsafeRunPromise())

    it("collects only failures", () =>
      Do(($) => {
        const chunk = Chunk.fill(10, () => 0)
        const result = $(Effect.partition(chunk, (n) => Effect.failSync(n)))
        const { tuple: [left, right] } = result
        assert.isTrue(left == chunk)
        assert.isTrue(right == Chunk.empty())
      }).unsafeRunPromise())

    it("collects failures and successes", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 9)
        const result = $(Effect.partition(
          chunk,
          (n) => n % 2 === 0 ? Effect.failSync(n) : Effect.sync(n)
        ))
        const { tuple: [left, right] } = result
        assert.isTrue(left == Chunk(0, 2, 4, 6, 8))
        assert.isTrue(right == Chunk(1, 3, 5, 7, 9))
      }).unsafeRunPromise())

    it("evaluates effects in correct order", () =>
      Do(($) => {
        const chunk = Chunk(2, 4, 6, 3, 5, 6)
        const ref = $(Ref.make(List.empty<number>()))
        $(Effect.partition(chunk, (n) => ref.update((list) => list.prepend(n))))
        const result = $(ref.get.map((list) => list.reverse))
        assert.isTrue(result == List(2, 4, 6, 3, 5, 6))
      }).unsafeRunPromise())
  })

  describe.concurrent("partitionPar", () => {
    it("collects a lot of successes", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 1000)
        const result = $(Effect.partitionPar(chunk, (n) => Effect.sync(n)))
        const { tuple: [left, right] } = result
        assert.isTrue(left == Chunk.empty())
        assert.isTrue(right == chunk)
      }).unsafeRunPromise())

    it("collects failures", () =>
      Do(($) => {
        const chunk = Chunk.fill(10, () => 0)
        const result = $(Effect.partitionPar(chunk, (n) => Effect.failSync(n)))
        const { tuple: [left, right] } = result
        assert.isTrue(left == chunk)
        assert.isTrue(right == Chunk.empty())
      }).unsafeRunPromise())

    it("collects failures and successes", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 9)
        const result = $(Effect.partitionPar(
          chunk,
          (n) => n % 2 === 0 ? Effect.failSync(n) : Effect.sync(n)
        ))
        const { tuple: [left, right] } = result
        assert.isTrue(left == Chunk(0, 2, 4, 6, 8))
        assert.isTrue(right == Chunk(1, 3, 5, 7, 9))
      }).unsafeRunPromise())
  })

  describe.concurrent("partitionPar - parallelism", () => {
    it("collects a lot of successes", () =>
      Do(($) => {
        const chunk = Chunk.range(0, 1000)
        const result = $(Effect.partitionPar(chunk, (n) => Effect.sync(n)).withParallelism(3))
        const { tuple: [left, right] } = result
        assert.isTrue(left == Chunk.empty())
        assert.isTrue(right == chunk)
      }).unsafeRunPromise())

    it("collects failures", () =>
      Do(($) => {
        const chunk = Chunk.fill(10, () => 0)
        const result = $(Effect.partitionPar(chunk, (n) => Effect.failSync(n)).withParallelism(3))
        const { tuple: [left, right] } = result
        assert.isTrue(left == chunk)
        assert.isTrue(right == Chunk.empty())
      }).unsafeRunPromise())

    it("collects failures and successes", () =>
      Do(($) => {
        const list = Chunk.range(0, 9)
        const result = $(
          Effect
            .partitionPar(list, (n) => n % 2 === 0 ? Effect.failSync(n) : Effect.sync(n))
            .withParallelism(3)
        )
        const { tuple: [left, right] } = result
        assert.isTrue(left == Chunk(0, 2, 4, 6, 8))
        assert.isTrue(right == Chunk(1, 3, 5, 7, 9))
      }).unsafeRunPromise())
  })
})

describe.concurrent("MVar", () => {
  it("isEmpty", () =>
    Do(($) => {
      const mVar = $(MVar.empty<void>())
      const mVar2 = $(MVar.make(undefined))
      const isEmpty1 = $(mVar.isEmpty)
      $(mVar.put(undefined))
      const isEmpty2 = $(mVar.isEmpty)
      const isEmpty3 = $(mVar2.isEmpty)
      $(mVar2.take)
      const isEmpty4 = $(mVar2.isEmpty)
      assert.isTrue(isEmpty1)
      assert.isFalse(isEmpty2)
      assert.isFalse(isEmpty3)
      assert.isTrue(isEmpty4)
    }).unsafeRunPromise())

  it("blocking put and take", () =>
    Do(($) => {
      const mVar = $(MVar.empty<number>())
      $(Effect.forkAll(Chunk.range(1, 100).map((i) => mVar.put(i))))
      const result = $(Effect.forEach(Chunk.range(1, 100), () => mVar.take))
      assert.isTrue(result.sort(Ord.number) == Chunk.range(1, 100))
    }).unsafeRunPromise())

  it("non-blocking tryPut and tryTake", () =>
    Do(($) => {
      const mVar = $(MVar.empty<void>())
      const result1 = $(mVar.tryPut(undefined))
      const result2 = $(mVar.tryPut(undefined))
      const result3 = $(mVar.tryTake)
      const result4 = $(mVar.tryTake)
      assert.isTrue(result1)
      assert.isFalse(result2)
      assert.isTrue(result3 == Maybe.some(undefined))
      assert.isTrue(result4 == Maybe.none)
    }).unsafeRunPromise())

  it("swap", () =>
    Do(($) => {
      const mVar = $(MVar.make(true))
      const result1 = $(mVar.swap(false))
      const result2 = $(mVar.take)
      assert.isTrue(result1)
      assert.isFalse(result2)
    }).unsafeRunPromise())

  it("update", () =>
    Do(($) => {
      const mVar = $(MVar.empty<boolean>())
      const fiber = $(mVar.update((b) => !b).fork)
      $(mVar.put(true))
      $(fiber.join)
      const result2 = $(mVar.take)
      assert.isFalse(result2)
    }).unsafeRunPromise())
})

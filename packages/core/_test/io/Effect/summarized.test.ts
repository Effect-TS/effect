describe.concurrent("Effect", () => {
  describe.concurrent("summarized", () => {
    it("returns summary and value", () =>
      Do(($) => {
        const counter = $(Ref.make(0))
        const increment = counter.updateAndGet((n) => n + 1)
        const result = $(increment.summarized(increment, (start, end) => [start, end] as const))
        const [[start, end], value] = result
        assert.strictEqual(start, 1)
        assert.strictEqual(value, 2)
        assert.strictEqual(end, 3)
      }).unsafeRunPromise())
  })
})

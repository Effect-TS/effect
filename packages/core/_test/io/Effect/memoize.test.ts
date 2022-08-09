describe.concurrent("Effect", () => {
  describe.concurrent("memoize", () => {
    it("non-memoized returns new instances on repeated calls", () =>
      Do(($) => {
        const io = Random.nextInt
        const result = $(io.zip(io))
        const { tuple: [first, second] } = result
        assert.notStrictEqual(first, second)
      }).unsafeRunPromise())

    it("memoized returns the same instance on repeated calls", () =>
      Do(($) => {
        const ioMemo = Random.nextInt.memoize
        const result = $(ioMemo.flatMap((io) => io.zip(io)))
        const { tuple: [first, second] } = result
        assert.strictEqual(first, second)
      }).unsafeRunPromise())

    it("memoized function returns the same instance on repeated calls", () =>
      Do(($) => {
        const randomNumber = (n: number) => Random.nextIntBetween(n, n + n)
        const memoized = $(Effect.memoize(randomNumber))
        const a = $(memoized(10))
        const b = $(memoized(10))
        const c = $(memoized(11))
        const d = $(memoized(11))
        assert.strictEqual(a, b)
        assert.notStrictEqual(b, c)
        assert.strictEqual(c, d)
      }).unsafeRunPromise())
  })
})

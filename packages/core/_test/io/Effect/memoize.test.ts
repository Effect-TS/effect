describe.concurrent("Effect", () => {
  describe.concurrent("memoize", () => {
    it("non-memoized returns new instances on repeated calls", async () => {
      const io = Random.nextInt
      const program = io.zip(io)

      const {
        tuple: [first, second]
      } = await program.unsafeRunPromise()

      assert.notStrictEqual(first, second)
    })

    it("memoized returns the same instance on repeated calls", async () => {
      const ioMemo = Random.nextInt.memoize()
      const program = ioMemo.flatMap((io) => io.zip(io))

      const {
        tuple: [first, second]
      } = await program.unsafeRunPromise()

      assert.strictEqual(first, second)
    })

    it("memoized function returns the same instance on repeated calls", async () => {
      const program = Effect.Do()
        .bind("memoized", () => Effect.memoize((n: number) => Random.nextIntBetween(n, n + n)))
        .tap(() => Effect.succeed("HERE 1"))
        .bind("a", ({ memoized }) => memoized(10))
        .tap(() => Effect.succeed("HERE 2"))
        .bind("b", ({ memoized }) => memoized(10))
        .bind("c", ({ memoized }) => memoized(11))
        .bind("d", ({ memoized }) => memoized(11))
        .apply(Random.withSeed(100))

      const { a, b, c, d } = await program.unsafeRunPromise()

      assert.strictEqual(a, b)
      assert.notStrictEqual(b, c)
      assert.strictEqual(c, d)
    })
  })
})

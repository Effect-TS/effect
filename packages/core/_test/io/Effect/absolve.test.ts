describe.concurrent("Effect", () => {
  describe.concurrent("absolve", () => {
    it("fluent/static method consistency", () =>
      Do(($) => {
        const ioEither = Effect.succeed(Either.right("test"))
        const abs1 = $(ioEither.absolve)
        const abs2 = $(Effect.absolve(ioEither))
        assert.strictEqual(abs1, "test")
        assert.strictEqual(abs2, "test")
      }).unsafeRunPromise())
  })
})

describe.concurrent("Effect", () => {
  describe.concurrent("RTS either helper tests", () => {
    it("lifting a value into right", () =>
      Do(($) => {
        const result = $(Effect.right(42))
        assert.isTrue(result == Either.right(42))
      }).unsafeRunPromise())

    it("lifting a value into left", () =>
      Do(($) => {
        const result = $(Effect.left(42))
        assert.isTrue(result == Either.left(42))
      }).unsafeRunPromise())
  })
})

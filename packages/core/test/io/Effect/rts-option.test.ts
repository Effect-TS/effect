describe.concurrent("Effect", () => {
  describe.concurrent("RTS option tests", () => {
    it("lifting a value to an option", () =>
      Do(($) => {
        const result = $(Effect.some(42))
        assert.isTrue(result == Maybe.some(42))
      }).unsafeRunPromise())

    it("using the none value", () =>
      Do(($) => {
        const result = $(Effect.none)
        assert.isTrue(result == Maybe.none)
      }).unsafeRunPromise())
  })
})

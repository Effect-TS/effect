describe.concurrent("Effect", () => {
  describe.concurrent("resurrect", () => {
    it("should fail checked", () =>
      Do(($) => {
        const error = new Error("fail")
        const result = $(Effect.failSync(error).unit.orDie.resurrect.either)
        assert.isTrue(result == Either.left(error))
      }).unsafeRunPromise())
  })
})

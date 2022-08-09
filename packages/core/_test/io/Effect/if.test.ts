describe.concurrent("Effect", () => {
  describe.concurrent("ifEffect", () => {
    it("runs `onTrue` if result of `b` is `true`", () =>
      Do(($) => {
        const result = $(Effect.ifEffect(
          Effect.sync(true),
          Effect.sync(true),
          Effect.sync(false)
        ))
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("runs `onFalse` if result of `b` is `false`", () =>
      Do(($) => {
        const result = $(Effect.ifEffect(
          Effect.sync(false),
          Effect.sync(true),
          Effect.sync(false)
        ))
        assert.isFalse(result)
      }).unsafeRunPromise())
  })
})

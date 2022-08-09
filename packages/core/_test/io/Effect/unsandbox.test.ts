describe.concurrent("Effect", () => {
  describe.concurrent("unsandbox", () => {
    it("unwraps exception", () =>
      Do(($) => {
        const failure = Effect.failSync(Cause.fail(new Error("fail")))
        const success = Effect.sync(100)
        const message = $(failure.unsandbox.foldEffect(
          (e) => Effect.sync(e.message),
          () => Effect.sync("unexpected")
        ))
        const result = $(success.unsandbox)
        assert.strictEqual(message, "fail")
        assert.strictEqual(result, 100)
      }).unsafeRunPromise())

    it("no information is lost during composition", () =>
      Do(($) => {
        function cause<R, E>(effect: Effect<R, E, never>): Effect<R, never, Cause<E>> {
          return effect.foldCauseEffect(Effect.succeed, Effect.fail)
        }
        const c = Cause.fail("oh no")
        const result = $(cause(
          Effect.failCauseSync(c)
            .sandbox
            .mapErrorCause((e) => e)
            .unsandbox
        ))
        assert.isTrue(result == c)
      }).unsafeRunPromise())
  })
})

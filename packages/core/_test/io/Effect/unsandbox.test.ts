describe.concurrent("Effect", () => {
  describe.concurrent("unsandbox", () => {
    it("unwraps exception", async () => {
      const failure = Effect.failSync(Cause.fail(new Error("fail")))
      const success = Effect.sync(100)
      const program = Effect.Do()
        .bind("message", () =>
          failure.unsandbox.foldEffect(
            (e) => Effect.sync(e.message),
            () => Effect.sync("unexpected")
          ))
        .bind("result", () => success.unsandbox)

      const { message, result } = await program.unsafeRunPromise()

      assert.strictEqual(message, "fail")
      assert.strictEqual(result, 100)
    })

    it("no information is lost during composition", async () => {
      function cause<R, E>(effect: Effect<R, E, never>): Effect<R, never, Cause<E>> {
        return effect.foldCauseEffect(Effect.succeed, Effect.fail)
      }
      const c = Cause.fail("oh no")
      const program = cause(
        Effect.failCauseSync(c)
          .sandbox
          .mapErrorCause((e) => e.untraced)
          .unsandbox
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.untraced == c)
    })
  })
})

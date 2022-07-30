describe.concurrent("Effect", () => {
  describe.concurrent("ifEffect", () => {
    it("runs `onTrue` if result of `b` is `true`", async () => {
      const program = Effect.ifEffect(
        Effect.sync(true),
        Effect.sync(true),
        Effect.sync(false)
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("runs `onFalse` if result of `b` is `false`", async () => {
      const program = Effect.ifEffect(
        Effect.sync(false),
        Effect.sync(true),
        Effect.sync(false)
      )

      const result = await program.unsafeRunPromise()

      assert.isFalse(result)
    })
  })
})

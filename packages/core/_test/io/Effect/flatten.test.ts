describe.concurrent("Effect", () => {
  describe.concurrent("flatten", () => {
    it("fluent/static method consistency", async () => {
      const effect = Effect.sync(Effect.sync("test"))
      const program = Effect.Do()
        .bind("flatten1", () => effect.flatten)
        .bind("flatten2", () => Effect.flatten(effect))

      const { flatten1, flatten2 } = await program.unsafeRunPromise()

      assert.strictEqual(flatten1, "test")
      assert.strictEqual(flatten2, "test")
    })
  })

  describe.concurrent("flattenErrorMaybe", () => {
    it("fails when given Some error", async () => {
      const program = Effect.failSync(Maybe.some("error")).flattenErrorMaybe("default")

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail("error"))
    })

    it("fails with default when given None error", async () => {
      const program = Effect.failSync(Maybe.none).flattenErrorMaybe("default")

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail("default"))
    })

    it("succeeds when given a value", async () => {
      const program = Effect.sync(1).flattenErrorMaybe("default")

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })
})

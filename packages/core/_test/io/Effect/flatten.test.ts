describe.concurrent("Effect", () => {
  describe.concurrent("flatten", () => {
    it("fluent/static method consistency", () =>
      Do(($) => {
        const effect = Effect.sync(Effect.sync("test"))
        const flatten1 = $(effect.flatten)
        const flatten2 = $(Effect.flatten(effect))
        assert.strictEqual(flatten1, "test")
        assert.strictEqual(flatten2, "test")
      }).unsafeRunPromise())
  })

  describe.concurrent("flattenErrorMaybe", () => {
    it("fails when given Some error", () =>
      Do(($) => {
        const result = $(Effect.failSync(Maybe.some("error")).flattenErrorMaybe("default"))
        assert.isTrue(result == Exit.fail("error"))
      }).unsafeRunPromiseExit())

    it("fails with default when given None error", () =>
      Do(($) => {
        const result = $(Effect.failSync(Maybe.none).flattenErrorMaybe("default"))
        assert.isTrue(result == Exit.fail("default"))
      }).unsafeRunPromiseExit())

    it("succeeds when given a value", () =>
      Do(($) => {
        const result = $(Effect.sync(1).flattenErrorMaybe("default"))
        assert.strictEqual(result, 1)
      }).unsafeRunPromiseExit())
  })
})

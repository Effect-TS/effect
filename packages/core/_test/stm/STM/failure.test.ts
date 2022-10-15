describe.concurrent("STM", () => {
  describe.concurrent("Failure must", () => {
    it("rollback full transaction", () =>
      Do(($) => {
        const tRef = $(TRef.make(0))
        const either = $((tRef.update((n) => n + 10) > STM.failSync("error")).commit.either)
        const value = $(tRef.get)
        assert.isTrue(either == Either.left("error"))
        assert.strictEqual(value, 0)
      }).unsafeRunPromise())

    it("be ignored", () =>
      Do(($) => {
        const tRef = $(TRef.make(0))
        const either = $((tRef.update((n) => n + 10) > STM.failSync("error")).commit.ignore)
        const value = $(tRef.get)
        assert.isUndefined(either)
        assert.strictEqual(value, 0)
      }).unsafeRunPromise())
  })
})

describe.concurrent("Promise", () => {
  describe.concurrent("interrupt", () => {
    it("interrupt a deferred", () =>
      Do(($) => {
        const deferred = $(Deferred.make<string, number>())
        const result = $(deferred.interrupt)
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})

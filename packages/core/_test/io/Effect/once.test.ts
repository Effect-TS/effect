describe.concurrent("Effect", () => {
  describe.concurrent("once", () => {
    it("returns an effect that will only be executed once", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const effect = $(ref.update((n) => n + 1).once)
        $(Effect.collectAllPar(effect.replicate(100)))
        const result = $(ref.get)
        assert.strictEqual(result, 1)
      }).unsafeRunPromise())
  })
})

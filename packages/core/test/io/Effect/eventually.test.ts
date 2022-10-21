describe.concurrent("Effect", () => {
  describe.concurrent("eventually", () => {
    it("succeeds eventually", () =>
      Do(($) => {
        function effect(ref: Ref<number>) {
          return ref.get.flatMap((n) =>
            n < 10 ?
              ref.update((n) => n + 1).zipRight(Effect.fail("Ouch")) :
              Effect.succeed(n)
          )
        }
        const ref = $(Ref.make(0))
        const result = $(effect(ref).eventually)
        assert.strictEqual(result, 10)
      }).unsafeRunPromise())
  })
})

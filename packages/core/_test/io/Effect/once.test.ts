describe.concurrent("Effect", () => {
  describe.concurrent("once", () => {
    it("returns an effect that will only be executed once", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make<number>(0))
        .bind("effect", ({ ref }) => ref.update((n) => n + 1).once())
        .tap(({ effect }) => Effect.collectAllPar(effect.replicate(100)))
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 1)
    })
  })
})

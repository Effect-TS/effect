describe.concurrent("Layer", () => {
  describe.concurrent("retry", () => {
    it("retry", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bindValue(
          "effect",
          ({ ref }) => ref.update((n) => n + 1) > Effect.fail("fail")
        )
        .bindValue("layer", ({ effect }) => Layer.fromEffectEnvironment(effect).retry(Schedule.recurs(3)))
        .tap(({ layer }) => Effect.scoped(layer.build()).ignore())
        .flatMap(({ ref }) => ref.get())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 4)
    })
  })
})

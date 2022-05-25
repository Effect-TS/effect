describe.concurrent("Layer", () => {
  describe.concurrent("tap", () => {
    it("peeks at an acquired resource", async () => {
      interface BarService {
        readonly bar: string
      }

      const BarTag = Tag<BarService>()

      const program = Effect.Do()
        .bind("ref", () => Ref.make("foo"))
        .bindValue(
          "layer",
          ({ ref }) => Layer.fromValue(BarTag)({ bar: "bar" }).tap((env) => ref.set(env.get(BarTag).bar))
        )
        .tap(({ layer }) => Effect.scoped(layer.build()))
        .bind("value", ({ ref }) => ref.get())

      const { value } = await program.unsafeRunPromise()

      assert.strictEqual(value, "bar")
    })
  })
})

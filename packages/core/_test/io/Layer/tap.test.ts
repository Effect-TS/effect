describe.concurrent("Layer", () => {
  describe.concurrent("tap", () => {
    it("peeks at an acquired resource", async () => {
      const BarServiceId = Symbol();

      interface BarService {
        readonly bar: string;
      }

      const BarService = Service<BarService>(BarServiceId);

      const program = Effect.Do()
        .bind("ref", () => Ref.make("foo"))
        .bindValue(
          "layer",
          ({ ref }) => Layer.fromValue(BarService)({ bar: "bar" }).tap((r) => ref.set(BarService.get(r).bar))
        )
        .tap(({ layer }) => Effect.scoped(layer.build()))
        .bind("value", ({ ref }) => ref.get());

      const { value } = await program.unsafeRunPromise();

      assert.strictEqual(value, "bar");
    });
  });
});

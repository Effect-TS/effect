describe.concurrent("Layer", () => {
  describe.concurrent("passthrough", () => {
    it("passes the inputs through to the next layer", async () => {
      const NumberServiceId = Symbol();
      interface NumberService {
        readonly value: number;
      }
      const NumberService = Service<NumberService>(NumberServiceId);

      const ToStringServiceId = Symbol();
      interface ToStringService {
        readonly value: string;
      }
      const ToStringService = Service<ToStringService>(ToStringServiceId);

      const layer = Layer.fromFunction(ToStringService)((_: Has<NumberService>) => ({
        value: NumberService.get(_).value.toString()
      }));

      const live = Layer.fromValue(NumberService)({ value: 1 }) >> layer.passthrough();

      const program = Effect.Do()
        .bind("i", () => Effect.service(NumberService))
        .bind("s", () => Effect.service(ToStringService))
        .provideLayer(live);

      const { i, s } = await program.unsafeRunPromise();

      assert.strictEqual(i.value, 1);
      assert.strictEqual(s.value, "1");
    });
  });
});

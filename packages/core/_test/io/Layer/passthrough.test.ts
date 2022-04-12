describe.concurrent("Layer", () => {
  describe.concurrent("passthrough", () => {
    it("passes the inputs through to the next layer", async () => {
      interface NumberService {
        readonly value: number;
      }
      const NumberTag = Tag<NumberService>();

      interface ToStringService {
        readonly value: string;
      }
      const ToStringTag = Tag<ToStringService>();

      const layer = Layer.fromFunction(NumberTag, ToStringTag)((_: NumberService) => ({
        value: _.value.toString()
      }));

      const live = Layer.fromValue(NumberTag)({ value: 1 }) >> layer.passthrough();

      const program = Effect.Do()
        .bind("i", () => Effect.service(NumberTag))
        .bind("s", () => Effect.service(ToStringTag))
        .provideLayer(live);

      const { i, s } = await program.unsafeRunPromise();

      assert.strictEqual(i.value, 1);
      assert.strictEqual(s.value, "1");
    });
  });
});

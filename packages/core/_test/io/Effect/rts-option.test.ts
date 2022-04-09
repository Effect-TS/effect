describe.concurrent("Effect", () => {
  describe.concurrent("RTS option tests", () => {
    it("lifting a value to an option", async () => {
      const program = Effect.some(42);

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.some(42));
    });

    it("using the none value", async () => {
      const program = Effect.none;

      const result = await program.unsafeRunPromise();

      assert.isTrue(result == Option.none);
    });
  });
});

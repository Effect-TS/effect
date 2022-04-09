describe.concurrent("Effect", () => {
  describe.concurrent("absolve", () => {
    it("fluent/static method consistency", async () => {
      const ioEither = Effect.succeed(Either.right("test"));
      const program = Effect.Do()
        .bind("abs1", () => ioEither.absolve())
        .bind("abs2", () => Effect.absolve(ioEither));

      const { abs1, abs2 } = await program.unsafeRunPromise();

      assert.strictEqual(abs1, "test");
      assert.strictEqual(abs2, "test");
    });
  });
});

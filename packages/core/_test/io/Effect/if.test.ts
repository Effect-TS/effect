describe.concurrent("Effect", () => {
  describe.concurrent("ifEffect", () => {
    it("runs `onTrue` if result of `b` is `true`", async () => {
      const program = Effect.ifEffect(
        Effect.succeed(true),
        Effect.succeed(true),
        Effect.succeed(false)
      );

      const result = await program.unsafeRunPromise();

      assert.isTrue(result);
    });

    it("runs `onFalse` if result of `b` is `false`", async () => {
      const program = Effect.ifEffect(
        Effect.succeed(false),
        Effect.succeed(true),
        Effect.succeed(false)
      );

      const result = await program.unsafeRunPromise();

      assert.isFalse(result);
    });
  });
});

describe.concurrent("Effect", () => {
  describe.concurrent("raceAll", () => {
    it("returns first success", async () => {
      const program = Effect.fail("fail").raceAll(List(Effect.succeed(24)));

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 24);
    });

    it("returns last failure", async () => {
      const program = (Effect.sleep((100).millis) > Effect.fail(24))
        .raceAll(List(Effect.fail(25)))
        .flip();

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 24);
    });

    it("returns success when it happens after failure", async () => {
      const program = Effect.fail(42).raceAll(
        List(Effect.succeed(24) < Effect.sleep((100).millis))
      );

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result, 24);
    });
  });
});

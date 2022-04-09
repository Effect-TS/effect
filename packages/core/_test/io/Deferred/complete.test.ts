describe.concurrent("Deferred", () => {
  describe.concurrent("complete", () => {
    it("complete a deferred using succeed", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, number>())
        .bind("success", ({ deferred }) => deferred.succeed(32))
        .bind("result", ({ deferred }) => deferred.await());

      const { result, success } = await program.unsafeRunPromise();

      assert.isTrue(success);
      assert.strictEqual(result, 32);
    });

    it("complete a deferred using complete", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, number>())
        .bind("ref", () => Ref.make(13))
        .tap(({ deferred, ref }) => deferred.complete(ref.updateAndGet((_) => _ + 1)))
        .bind("v1", ({ deferred }) => deferred.await())
        .bind("v2", ({ deferred }) => deferred.await());

      const { v1, v2 } = await program.unsafeRunPromise();

      assert.strictEqual(v1, 14);
      assert.strictEqual(v2, 14);
    });

    it("complete a deferred using completeWith", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<never, number>())
        .bind("ref", () => Ref.make(13))
        .tap(({ deferred, ref }) => deferred.completeWith(ref.updateAndGet((_) => _ + 1)))
        .bind("v1", ({ deferred }) => deferred.await())
        .bind("v2", ({ deferred }) => deferred.await());

      const { v1, v2 } = await program.unsafeRunPromise();

      assert.strictEqual(v1, 14);
      assert.strictEqual(v2, 15);
    });

    it("complete a deferred twice", async () => {
      const program = Effect.Do()
        .bind("deferred", () => Deferred.make<string, number>())
        .tap(({ deferred }) => deferred.succeed(1))
        .bind("success", ({ deferred }) => deferred.complete(Effect.succeedNow(9)))
        .bind("result", ({ deferred }) => deferred.await());

      const { result, success } = await program.unsafeRunPromise();

      assert.isFalse(success);
      assert.strictEqual(result, 1);
    });
  });
});

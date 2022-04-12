const initial = "initial";
const update = "update";

describe.concurrent("FiberRef", () => {
  describe.concurrent("set", () => {
    it("updates the current value", async () => {
      const program = FiberRef.make(initial)
        .tap((fiberRef) => fiberRef.set(update))
        .flatMap((fiberRef) => fiberRef.get());

      const result = await Effect.scoped(program).unsafeRunPromise();

      assert.strictEqual(result, update);
    });

    it("by a child doesn't update parent's value", async () => {
      const program = Effect.Do()
        .bind("fiberRef", () => FiberRef.make(initial))
        .bind("deferred", () => Deferred.make<never, void>())
        .tap(({ deferred, fiberRef }) => fiberRef.set(update).zipRight(deferred.succeed(undefined)).fork())
        .tap(({ deferred }) => deferred.await())
        .flatMap(({ fiberRef }) => fiberRef.get());

      const result = await Effect.scoped(program).unsafeRunPromise();

      assert.strictEqual(result, initial);
    });
  });
});

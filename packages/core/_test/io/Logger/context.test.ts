import { TestLogger } from "@effect/core/test/test-utils/TestLogger";

describe.concurrent("Logger", () => {
  describe.concurrent("context", () => {
    it("should capture the correct context", async () => {
      const value = "value";
      const program = Effect.scoped(
        Effect.Do()
          .bind("ref", () => FiberRef.make(value))
          .tap(() => Effect.log("It's alive!"))
          .bind("output", () => TestLogger.logOutput)
      ).provideLayer(TestLogger.default);

      const { output, ref } = await program.unsafeRunPromise();

      assert.strictEqual(output.size, 1);
      assert.isTrue(output[0].map((entry) => entry.context.get(ref)) == Option.some(value));
    });
  });
});

import { TestLogger } from "@effect/core/test/test-utils/TestLogger";

describe.concurrent("Logger", () => {
  describe.concurrent("logAnnotations", () => {
    it("log annotations", async () => {
      const key = "key";
      const value = "value";
      const program = Effect.logAnnotate(key, value)(Effect.log("It's alive!"))
        .zipRight(TestLogger.logOutput)
        .provideLayer(TestLogger.default);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.array.length, 1);
      assert.isTrue(result[0].map((_) => _.annotations.get(key)) == value);
    });
  });
});

import { TestLogger } from "@effect/core/test/test-utils/TestLogger";

describe.concurrent("Logger", () => {
  describe.concurrent("logLevel", () => {
    it("change log level in region", async () => {
      const program = Effect.log("It's alive")
        .apply(LogLevel(LogLevel.Warning))
        .zipRight(TestLogger.logOutput)
        .provideLayer(TestLogger.default);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.array.length, 1);
      assert.isTrue(result[0].map((_) => _.message()) == Option.some("It's alive"));
      assert.isTrue(result[0].map((_) => _.logLevel) == Option.some(LogLevel.Warning));
    });

    it("log at a different log level", async () => {
      const program = Effect.logWarning("It's alive")
        .zipRight(TestLogger.logOutput)
        .provideLayer(TestLogger.default);

      const result = await program.unsafeRunPromise();

      assert.strictEqual(result.array.length, 1);
      assert.isTrue(result[0].map((_) => _.message()) == Option.some("It's alive"));
      assert.isTrue(result[0].map((_) => _.logLevel) == Option.some(LogLevel.Warning));
    });
  });
});

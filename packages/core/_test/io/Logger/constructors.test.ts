import { TestLogger } from "@effect/core/test/test-utils/TestLogger"

describe.concurrent("Logger", () => {
  describe.concurrent("constructors", () => {
    it("simple", async () => {
      const program = (Effect.log("It's alive!") > TestLogger.logOutput).provideLayer(
        TestLogger.default
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result.array.length, 1)
      assert.isTrue(result[0].map((_) => _.message) == Maybe.some("It's alive!"))
      assert.isTrue(result[0].map((_) => _.logLevel) == Maybe.some(LogLevel.Info))
    })

    it("none", async () => {
      const program = Effect.log("It's alive!")
        .apply(Effect.disableLogging)
        .zipRight(TestLogger.logOutput)
        .provideLayer(TestLogger.default)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result.array.length, 0)
    })
  })
})

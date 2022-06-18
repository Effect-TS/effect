import { TestLogger } from "@effect/core/test/test-utils/TestLogger"

describe.concurrent("Logger", () => {
  describe.concurrent("logSpan", () => {
    it("log at a span", async () => {
      const program = Effect.logSpan("initial segment")(Effect.log("It's alive!"))
        .zipRight(TestLogger.logOutput)
        .provideLayer(TestLogger.default)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result.array.length, 1)
      assert.isTrue(result[0].flatMap((_) => _.spans.head.map((_) => _.label)) == Maybe.some("initial segment"))
    })
  })
})

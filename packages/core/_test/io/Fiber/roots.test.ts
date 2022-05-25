import { constTrue } from "@tsplus/stdlib/data/Function"

describe.concurrent("Fiber", () => {
  describe.concurrent("roots", () => {
    it("dual roots", async () => {
      function rootContains(
        fiber: Fiber.Runtime<any, any>
      ): Effect<unknown, never, boolean> {
        return Fiber.roots.map((chunk) => chunk.find((f) => f === fiber).isSome())
      }

      const rootsTest = Effect.Do()
        .bind("fiber1", () => Effect.never.forkDaemon())
        .bind("fiber2", () => Effect.never.forkDaemon())
        .tap(({ fiber1, fiber2 }) =>
          rootContains(fiber1)
            .zipWith(rootContains(fiber2), (b1, b2) => b1 && b2)
            .repeatUntil(identity)
        )
        .tap(({ fiber1, fiber2 }) => fiber1.interrupt().zipRight(fiber2.interrupt()))
        .map(constTrue)

      // Since `rootsTest` has a potentially infinite loop (T.never + T.repeatUntil),
      // race the real test against a 10 second timer and fail the test if it didn't complete.
      // This delay time may be increased if it turns out this test is flaky.
      const program = Effect.sleep((10).seconds)
        .zipRight(Effect.succeedNow(false))
        .race(rootsTest)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

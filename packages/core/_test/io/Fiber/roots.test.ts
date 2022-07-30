import { constTrue } from "@tsplus/stdlib/data/Function"

function rootContains(
  fiber: Fiber.Runtime<any, any>
): Effect<never, never, boolean> {
  return Fiber.roots.map((chunk) => chunk.find((f) => f === fiber).isSome())
}

describe.concurrent("Fiber", () => {
  describe.concurrent("roots", () => {
    it("dual roots", () =>
      Do(($) => {
        const fiber1 = $(Effect.never.forkDaemon)
        const fiber2 = $(Effect.never.forkDaemon)
        $(
          rootContains(fiber1)
            .zipWith(rootContains(fiber2), (b1, b2) => b1 && b2)
            .repeatUntil(identity)
        )
        const rootsTest = fiber1.interrupt.zipRight(fiber2.interrupt).map(constTrue)
        // Since `rootsTest` has a potentially infinite loop (T.never + T.repeatUntil),
        // race the real test against a 10 second timer and fail the test if it didn't complete.
        // This delay time may be increased if it turns out this test is flaky.
        const program = Effect.sleep((10).seconds)
          .zipRight(Effect.succeed(false))
          .race(rootsTest)
        const result = $(program)
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})

describe.concurrent("Fiber", () => {
  describe.concurrent("join on interrupted Fiber", () => {
    it("is inner interruption", () =>
      Do(($) => {
        const fiberId = FiberId(0, 123, TraceElement.empty)
        const result = $(Fiber.interruptAs(fiberId).join.exit)
        assert.isTrue(
          result.isFailure() &&
            result.cause.isInterruptType() &&
            (result.cause.fiberId == fiberId)
        )
      }).unsafeRunPromiseExit())
  })
})

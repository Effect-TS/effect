describe.concurrent("Effect", () => {
  describe.concurrent("timeout disconnect", () => {
    it("returns `Some` with the produced value if the effect completes before the timeout elapses", () =>
      Do(($) => {
        const result = $(Effect.unit.disconnect.timeout((100).millis))
        assert.isTrue(result == Maybe.some(undefined))
      }))

    it.effect("returns `None` otherwise", () =>
      Do(($) => {
        const fiber = $(Effect.never.uninterruptible.disconnect.timeout((100).millis).fork)
        $(TestClock.adjust((100).millis))
        const result = $(fiber.join)
        assert.isTrue(result == Maybe.none)
      }))
  })
})

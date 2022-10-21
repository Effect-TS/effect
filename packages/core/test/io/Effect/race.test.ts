describe.concurrent("Effect", () => {
  describe.concurrent("raceAll", () => {
    it("returns first success", () =>
      Do(($) => {
        const result = $(Effect.failSync("fail").raceAll(List(Effect.sync(24))))
        assert.strictEqual(result, 24)
      }).unsafeRunPromise())

    it("returns last failure", () =>
      Do(($) => {
        const result = $(
          Effect.sleep((100).millis).zipRight(Effect.failSync(24))
            .raceAll(List(Effect.failSync(25)))
            .flip
        )
        assert.strictEqual(result, 24)
      }).unsafeRunPromise())

    it("returns success when it happens after failure", () =>
      Do(($) => {
        const result = $(
          Effect.failSync(42).raceAll(List(Effect.sync(24).zipLeft(Effect.sleep((100).millis))))
        )
        assert.strictEqual(result, 24)
      }).unsafeRunPromise())
  })
})

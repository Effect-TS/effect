describe.concurrent("Effect", () => {
  describe.concurrent("raceAll", () => {
    it("returns first success", async () => {
      const program = Effect.failSync("fail").raceAll(List(Effect.sync(24)))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 24)
    })

    it("returns last failure", async () => {
      const program = (Effect.sleep((100).millis) > Effect.failSync(24))
        .raceAll(List(Effect.failSync(25)))
        .flip

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 24)
    })

    it("returns success when it happens after failure", async () => {
      const program = Effect.failSync(42).raceAll(
        List(Effect.sync(24) < Effect.sleep((100).millis))
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 24)
    })
  })
})

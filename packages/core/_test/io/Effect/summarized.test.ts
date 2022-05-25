describe.concurrent("Effect", () => {
  describe.concurrent("summarized", () => {
    it("returns summary and value", async () => {
      const program = Effect.Do()
        .bind("counter", () => Ref.make<number>(0))
        .bindValue("increment", ({ counter }) => counter.updateAndGet((n) => n + 1))
        .flatMap(({ increment }) => increment.summarized(increment, (start, end) => Tuple(start, end)))

      const {
        tuple: [
          {
            tuple: [start, end]
          },
          value
        ]
      } = await program.unsafeRunPromise()

      assert.strictEqual(start, 1)
      assert.strictEqual(value, 2)
      assert.strictEqual(end, 3)
    })
  })
})

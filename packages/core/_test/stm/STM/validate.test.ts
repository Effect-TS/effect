describe.concurrent("STM", () => {
  describe.concurrent("validate", () => {
    it("returns all errors if never valid", async () => {
      const input = Chunk.fill(10, () => 0)
      const program = STM.validate(input, STM.failNow).commit

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(input))
    })

    it("accumulate errors and ignore successes", async () => {
      const input = Chunk.range(0, 9)
      const program = STM.validate(input, (n) => n % 2 === 0 ? STM.succeed(n) : STM.fail(n)).commit

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Chunk(1, 3, 5, 7, 9)))
    })

    it("accumulate successes", async () => {
      const input = Chunk.range(0, 9)
      const program = STM.validate(input, STM.succeed)
        .commit

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == input)
    })
  })

  describe.concurrent("validateFirst", () => {
    it("returns all errors if never valid", async () => {
      const input = Chunk.fill(10, () => 0)
      const program = STM.validateFirst(input, STM.failNow)
        .commit

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(input))
    })

    it("runs sequentially and short circuits on first success validation", async () => {
      const input = Chunk.range(1, 9)
      const program = STM.Do()
        .bind("counter", () => TRef.make(0))
        .bind("result", ({ counter }) =>
          STM.validateFirst(
            input,
            (n) => counter.update((_) => _ + 1) > (n === 6 ? STM.succeed(n) : STM.fail(n))
          ))
        .bind("count", ({ counter }) => counter.get)
        .commit

      const { count, result } = await program.unsafeRunPromise()

      assert.strictEqual(result, 6)
      assert.strictEqual(count, 6)
    })

    it("returns errors in correct order", async () => {
      const input = Chunk(2, 4, 6, 3, 5, 6)
      const program = STM.validateFirst(input, STM.failNow)
        .commit

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(input))
    })
  })
})

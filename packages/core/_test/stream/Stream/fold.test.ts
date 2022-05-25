describe.concurrent("Stream", () => {
  describe.concurrent("runFoldWhile", () => {
    it("should continue running while the predicate holds true", async () => {
      const program = Stream(1, 1, 1, 1, 1).runFoldWhile(
        0,
        (n) => n < 3,
        (a, b) => a + b
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 3)
    })
  })
})

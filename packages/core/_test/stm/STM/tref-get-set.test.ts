describe.concurrent("STM", () => {
  describe.concurrent("Make a new `TRef` and", () => {
    it("get its initial value", async () => {
      const program = TRef.make(14)
        .flatMap((ref) => ref.get)
        .commit()

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 14)
    })

    it("set a new value", async () => {
      const program = TRef.make(14)
        .tap((ref) => ref.set(42))
        .flatMap((ref) => ref.get)
        .commit()

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })
  })
})

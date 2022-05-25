describe.concurrent("Effect", () => {
  describe.concurrent("RTS either helper tests", () => {
    it("lifting a value into right", async () => {
      const program = Effect.right(42)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.right(42))
    })

    it("lifting a value into left", async () => {
      const program = Effect.left(42)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(42))
    })
  })
})

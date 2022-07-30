describe.concurrent("Effect", () => {
  describe.concurrent("resurrect", () => {
    it("should fail checked", async () => {
      const error = new Error("fail")
      const program = Effect.failSync(error).unit.orDie.resurrect.either

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(error))
    })
  })
})

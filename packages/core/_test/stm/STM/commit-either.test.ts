describe.concurrent("STM", () => {
  describe.concurrent("commitEither", () => {
    it("commits this transaction whether it is a success or a failure", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(false))
        .bind("either", ({ tRef }) => (tRef.set(true) > STM.fail("error")).commitEither.flip)
        .bind("value", ({ tRef }) => tRef.get.commit)

      const { either, value } = await program.unsafeRunPromise()

      assert.strictEqual(either, "error")
      assert.isTrue(value)
    })
  })
})

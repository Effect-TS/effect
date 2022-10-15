describe.concurrent("STM", () => {
  describe.concurrent("Failure must", () => {
    it("rollback full transaction", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bind(
          "either",
          ({ tRef }) => (tRef.update((n) => n + 10) > STM.failSync("error")).commit.either
        )
        .bind("value", ({ tRef }) => tRef.get)

      const { either, value } = await program.unsafeRunPromise()

      assert.isTrue(either == Either.left("error"))
      assert.strictEqual(value, 0)
    })

    it("be ignored", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bind(
          "either",
          ({ tRef }) => (tRef.update((n) => n + 10) > STM.failSync("error")).commit.ignore
        )
        .bind("value", ({ tRef }) => tRef.get)

      const { either, value } = await program.unsafeRunPromise()

      assert.isUndefined(either)
      assert.strictEqual(value, 0)
    })
  })
})

describe.concurrent("Effect", () => {
  describe.concurrent("parallelErrors", () => {
    it("one failure", async () => {
      const program = Effect.Do()
        .bind("f1", () => Effect.failSync("error1").fork)
        .bind("f2", () => Effect.sync("success1").fork)
        .flatMap(({ f1, f2 }) => f1.zip(f2).join.parallelErrors.flip)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk.single("error1"))
    })

    it("all failures", async () => {
      const program = Effect.Do()
        .bind("f1", () => Effect.failSync("error1").fork)
        .bind("f2", () => Effect.failSync("error2").fork)
        .flatMap(({ f1, f2 }) => f1.zip(f2).join.parallelErrors.flip)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Chunk("error1", "error2"))
    })
  })
})

describe.concurrent("Effect", () => {
  describe.concurrent("parallelErrors", () => {
    it("one failure", () =>
      Do(($) => {
        const fiber1 = $(Effect.failSync("error1").fork)
        const fiber2 = $(Effect.sync("success1").fork)
        const result = $(fiber1.zip(fiber2).join.parallelErrors.flip)
        assert.isTrue(result == Chunk.single("error1"))
      }).unsafeRunPromise())

    it("all failures", () =>
      Do(($) => {
        const fiber1 = $(Effect.failSync("error1").fork)
        const fiber2 = $(Effect.failSync("error2").fork)
        const result = $(fiber1.zip(fiber2).join.parallelErrors.flip)
        assert.isTrue(result == Chunk("error1", "error2"))
      }).unsafeRunPromise())
  })
})

describe.concurrent("Channel", () => {
  describe.concurrent("scoped", () => {
    it("failure", async () => {
      const program = Channel.scoped(Effect.fail("error")).runCollect()

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced() == Exit.fail("error"))
    })
  })
})

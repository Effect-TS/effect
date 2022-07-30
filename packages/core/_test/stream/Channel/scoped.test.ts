describe.concurrent("Channel", () => {
  describe.concurrent("scoped", () => {
    it("failure", async () => {
      const program = Channel.scoped(Effect.failSync("error")).runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail("error"))
    })
  })
})

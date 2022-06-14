describe.concurrent("Channel", () => {
  describe.concurrent("mapError", () => {
    it("structure confusion", async () => {
      const program = Channel.fail("err")
        .mapError(() => 1)
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail(1))
    })
  })
})

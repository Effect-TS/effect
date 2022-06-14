describe.concurrent("Channel", () => {
  describe.concurrent("catchAll", () => {
    it("structure confusion", async () => {
      const program = Channel.write(8)
        .catchAll(() => Channel.write(0).concatMap(() => Channel.fail("error1")))
        .concatMap(() => Channel.fail("error2"))
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail("error2"))
    })
  })
})

describe.concurrent("Channel", () => {
  describe.concurrent("mapError", () => {
    it("structure confusion", async () => {
      const program = Channel.failSync("err")
        .mapError(() => 1)
        .runCollect

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(1))
    })
  })
})

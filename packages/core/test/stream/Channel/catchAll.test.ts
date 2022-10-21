describe.concurrent("Channel", () => {
  describe.concurrent("catchAll", () => {
    it("structure confusion", () =>
      Do(($) => {
        const result = $(
          Channel.write(8)
            .catchAll(() => Channel.write(0).concatMap(() => Channel.failSync("error1")))
            .concatMap(() => Channel.failSync("error2"))
            .runCollect
            .exit
        )
        assert.isTrue(result == Exit.fail("error2"))
      }).unsafeRunPromise())
  })
})

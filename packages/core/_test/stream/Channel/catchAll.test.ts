describe.concurrent("Channel", () => {
  describe.concurrent("catchAll", () => {
    it("structure confusion", () =>
      Do(($) => {
        const result = $(
          Channel.write(8)
            .catchAll(() => Channel.write(0).concatMap(() => Channel.fail("error1")))
            .concatMap(() => Channel.fail("error2"))
            .runCollect
            .exit
        )
        assert.isTrue(result.untraced == Exit.fail("error2"))
      }).unsafeRunPromise())
  })
})

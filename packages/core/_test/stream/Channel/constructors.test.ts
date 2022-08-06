describe.concurrent("Channel", () => {
  it("succeed", () =>
    Do(($) => {
      const result = $(Channel.sync(1).runCollect)
      const { tuple: [chunk, z] } = result
      assert.isTrue(chunk.isEmpty)
      assert.strictEqual(z, 1)
    }).unsafeRunPromise())

  it("fail", () =>
    Do(($) => {
      const result = $(Channel.fail("uh oh").runCollect.exit)
      assert.isTrue(result == Exit.fail("uh oh"))
    }).unsafeRunPromiseExit())
})

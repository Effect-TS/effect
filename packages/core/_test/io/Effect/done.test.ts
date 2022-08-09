const ExampleError = new Error("Oh noes!")

describe.concurrent("Effect", () => {
  describe.concurrent("done", () => {
    it("check that done lifts exit() result into IO", () =>
      Do(($) => {
        const fiberId = FiberId(0, 123)
        const error = ExampleError
        const completed = $(Effect.done(Exit.succeed(1)))
        const interrupted = $(Effect.done(Exit.interrupt(fiberId)).exit)
        const terminated = $(Effect.done(Exit.die(error)).exit)
        const failed = $(Effect.done(Exit.fail(error)).exit)
        assert.strictEqual(completed, 1)
        assert.isTrue(interrupted == Exit.interrupt(fiberId))
        assert.isTrue(terminated == Exit.die(error))
        assert.isTrue(failed == Exit.fail(error))
      }).unsafeRunPromise())
  })
})

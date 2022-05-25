const ExampleError = new Error("Oh noes!")

describe.concurrent("Effect", () => {
  describe.concurrent("done", () => {
    it("check that done lifts exit result into IO", async () => {
      const fiberId = FiberId(0, 123, TraceElement.empty)
      const error = ExampleError
      const program = Effect.Do()
        .bind("completed", () => Effect.done(Exit.succeed(1)))
        .bind("interrupted", () => Effect.done(Exit.interrupt(fiberId)).exit())
        .bind("terminated", () => Effect.done(Exit.die(error)).exit())
        .bind("failed", () => Effect.done(Exit.fail(error)).exit())

      const { completed, failed, interrupted, terminated } = await program.unsafeRunPromise()

      assert.strictEqual(completed, 1)
      assert.isTrue(interrupted.untraced() == Exit.interrupt(fiberId))
      assert.isTrue(terminated.untraced() == Exit.die(error))
      assert.isTrue(failed.untraced() == Exit.fail(error))
    })
  })
})

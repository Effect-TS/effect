describe.concurrent("Effect", () => {
  describe.concurrent("catchNonFatalOrDie", () => {
    it("recovers from non-fatal", () =>
      Do(($) => {
        const message = "division by zero"
        const result = $(
          Effect
            .failSync(new IllegalArgumentException(message))
            .catchNonFatalOrDie((e) => Effect.sync(e.message))
            .exit
        )
        assert.isTrue(result == Exit.succeed(message))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("catchAllDefect", () => {
    it("recovers from all defects", () =>
      Do(($) => {
        const message = "division by zero"
        const result = $(
          Effect
            .die(new IllegalArgumentException(message))
            .catchAllDefect((e) => Effect.sync((e as Error).message))
        )
        assert.strictEqual(result, message)
      }).unsafeRunPromise())

    it("leaves errors", () =>
      Do(($) => {
        const error = new IllegalArgumentException("division by zero")
        const result = $(
          Effect.failSync(error).catchAllDefect((e) => Effect.sync((e as Error).message).exit)
        )
        assert.isTrue(result == Exit.fail(error))
      }).unsafeRunPromiseExit())

    it("leaves values", () =>
      Do(($) => {
        const error = new IllegalArgumentException("division by zero")
        const result = $(
          Effect.sync(error).catchAllDefect((e) => Effect.sync((e as Error).message))
        )
        assert.deepEqual(result, error)
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("catchSomeDefect", () => {
    it("recovers from some defects", () =>
      Do(($) => {
        const message = "division by zero"
        const result = $(
          Effect.dieSync(new IllegalArgumentException(message))
            .catchSomeDefect((e) =>
              e instanceof IllegalArgumentException
                ? Maybe.some(Effect.sync(e.message))
                : Maybe.none
            )
        )
        assert.strictEqual(result, message)
      }).unsafeRunPromise())

    it("leaves the rest", () =>
      Do(($) => {
        const error = new IllegalArgumentException("division by zero")
        const result = $(
          Effect.dieSync(error).catchSomeDefect((e) =>
            e instanceof RuntimeError ? Maybe.some(Effect.sync(e.message)) : Maybe.none
          ).exit
        )
        assert.isTrue(result == Exit.die(error))
      }).unsafeRunPromiseExit())

    it("leaves errors", () =>
      Do(($) => {
        const error = new IllegalArgumentException("division by zero")
        const result = $(
          Effect.failSync(error).catchSomeDefect((e) =>
            e instanceof IllegalArgumentException
              ? Maybe.some(Effect.sync(e.message))
              : Maybe.none
          ).exit
        )
        assert.isTrue(result == Exit.fail(error))
      }).unsafeRunPromiseExit())

    it("leaves values", () =>
      Do(($) => {
        const error = new IllegalArgumentException("division by zero")
        const result = $(
          Effect.sync(error).catchSomeDefect((e) =>
            e instanceof IllegalArgumentException
              ? Maybe.some(Effect.sync(e.message))
              : Maybe.none
          )
        )
        assert.deepEqual(result, error)
      }).unsafeRunPromise())
  })
})

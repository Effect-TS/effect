describe.concurrent("Effect", () => {
  describe.concurrent("catchNonFatalOrDie", () => {
    it("recovers from non-fatal", async () => {
      const message = "division by zero"
      const program = Effect.failSync(
        new IllegalArgumentException(message)
      ).catchNonFatalOrDie((e) => Effect.sync(e.message))

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.succeed(message))
    })
  })

  describe.concurrent("catchAllDefect", () => {
    it("recovers from all defects", async () => {
      const message = "division by zero"
      const program = Effect.die(new IllegalArgumentException(message)).catchAllDefect(
        (e) => Effect.sync((e as Error).message)
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, message)
    })

    it("leaves errors", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.failSync(error).catchAllDefect((e) =>
        Effect.sync((e as Error).message)
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(error))
    })

    it("leaves values", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.sync(error).catchAllDefect((e) => Effect.sync((e as Error).message))

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, error)
    })
  })

  describe.concurrent("catchSomeDefect", () => {
    it("recovers from some defects", async () => {
      const message = "division by zero"
      const program = Effect.die(new IllegalArgumentException(message)).catchSomeDefect(
        (e) =>
          e instanceof IllegalArgumentException
            ? Maybe.some(Effect.sync(e.message))
            : Maybe.none
      )

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, message)
    })

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.die(error).catchSomeDefect((e) =>
        e instanceof RuntimeError ? Maybe.some(Effect.sync(e.message)) : Maybe.none
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.die(error))
    })

    it("leaves errors", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.failSync(error).catchSomeDefect((e) =>
        e instanceof IllegalArgumentException
          ? Maybe.some(Effect.sync(e.message))
          : Maybe.none
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(error))
    })

    it("leaves values", async () => {
      const error = new IllegalArgumentException("division by zero")
      const program = Effect.sync(error).catchSomeDefect((e) =>
        e instanceof IllegalArgumentException
          ? Maybe.some(Effect.sync(e.message))
          : Maybe.none
      )

      const result = await program.unsafeRunPromise()

      assert.deepEqual(result, error)
    })
  })
})

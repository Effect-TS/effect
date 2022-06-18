describe.concurrent("Effect", () => {
  describe.concurrent("unrefine", () => {
    it("converts some fiber failures into errors", async () => {
      const message = "division by zero"
      const defect = Effect.die(new IllegalArgumentException(message))
      const program = defect.unrefine((u) => u instanceof IllegalArgumentException ? Maybe.some(u.message) : Maybe.none)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail(message))
    })

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero")
      const defect = Effect.die(error)
      const program = defect.unrefine((u) => u instanceof RuntimeError ? Maybe.some(u.message) : Maybe.none)

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.die(error))
    })
  })

  describe.concurrent("unrefineWith", () => {
    it("converts some fiber failures into errors", async () => {
      const message = "division by zero"
      const defect = Effect.die(new IllegalArgumentException(message))
      const program = defect.unrefineWith(
        (u) => u instanceof IllegalArgumentException ? Maybe.some(u.message) : Maybe.none,
        () => Maybe.none
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail(message))
    })

    it("leaves the rest", async () => {
      const error = new IllegalArgumentException("division by zero")
      const defect = Effect.die(error)
      const program = defect.unrefineWith(
        (u) => (u instanceof RuntimeError ? Maybe.some(u.message) : Maybe.none),
        () => Maybe.none
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.die(error))
    })

    it("uses the specified function to convert the `E` into an `E1`", async () => {
      const failure = Effect.fail("fail")
      const program = failure.unrefineWith(
        (u) => u instanceof IllegalArgumentException ? Maybe.some(u.message) : Maybe.none,
        () => Maybe.none
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail(Maybe.none))
    })
  })
})

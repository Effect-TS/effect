describe.concurrent("Effect", () => {
  describe.concurrent("unrefine", () => {
    it("converts some fiber failures into errors", () =>
      Do(($) => {
        const message = "division by zero"
        const defect = Effect.dieSync(new IllegalArgumentException(message))
        const result = $(
          defect.unrefine((u) =>
            u instanceof IllegalArgumentException ?
              Maybe.some(u.message) :
              Maybe.none
          ).exit
        )
        assert.isTrue(result == Exit.fail(message))
      }).unsafeRunPromiseExit())

    it("leaves the rest", () =>
      Do(($) => {
        const error = new IllegalArgumentException("division by zero")
        const defect = Effect.dieSync(error)
        const result = $(
          defect.unrefine((u) =>
            u instanceof RuntimeError ?
              Maybe.some(u.message) :
              Maybe.none
          ).exit
        )
        assert.isTrue(result == Exit.die(error))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("unrefineWith", () => {
    it("converts some fiber failures into errors", () =>
      Do(($) => {
        const message = "division by zero"
        const defect = Effect.dieSync(new IllegalArgumentException(message))
        const result = $(
          defect.unrefineWith(
            (u) => u instanceof IllegalArgumentException ? Maybe.some(u.message) : Maybe.none,
            () => Maybe.none
          ).exit
        )
        assert.isTrue(result == Exit.fail(message))
      }).unsafeRunPromiseExit())

    it("leaves the rest", () =>
      Do(($) => {
        const error = new IllegalArgumentException("division by zero")
        const defect = Effect.dieSync(error)
        const result = $(
          defect.unrefineWith(
            (u) => (u instanceof RuntimeError ? Maybe.some(u.message) : Maybe.none),
            () => Maybe.none
          ).exit
        )
        assert.isTrue(result == Exit.die(error))
      }).unsafeRunPromiseExit())

    it("uses the specified function to convert the `E` into an `E1`", () =>
      Do(($) => {
        const failure = Effect.failSync("fail")
        const result = $(
          failure.unrefineWith(
            (u) => u instanceof IllegalArgumentException ? Maybe.some(u.message) : Maybe.none,
            () => Maybe.none
          ).exit
        )
        assert.isTrue(result == Exit.fail(Maybe.none))
      }).unsafeRunPromiseExit())
  })
})

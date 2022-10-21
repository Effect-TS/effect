describe.concurrent("Effect", () => {
  describe.concurrent("tapErrorCause", () => {
    it("effectually peeks at the cause of the failure of this effect", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const result = $(Effect.dieMessage("die").tapErrorCause(() => ref.set(true)).exit)
        const effect = $(ref.get)
        assert.isTrue(result.isFailure() && result.cause.dieMaybe.isSome())
        assert.isTrue(effect)
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("tapDefect", () => {
    it("effectually peeks at the cause of the failure of this effect", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const result = $(Effect.dieMessage("die").tapDefect(() => ref.set(true)).exit)
        const effect = $(ref.get)
        assert.isTrue(result.isFailure() && result.cause.dieMaybe.isSome())
        assert.isTrue(effect)
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("tapEither", () => {
    it("effectually peeks at the failure of this effect", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(
          Effect.fail(42)
            .tapEither((either) => either.fold((n) => ref.set(n), () => ref.set(-1)))
            .exit
        )
        const result = $(ref.get)
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())

    it("effectually peeks at the success of this effect", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        $(
          Effect.succeed(42)
            .tapEither((either) => either.fold(() => ref.set(-1), (n) => ref.set(n)))
            .exit
        )
        const result = $(ref.get)
        assert.strictEqual(result, 42)
      }).unsafeRunPromise())
  })

  describe.concurrent("tapSome", () => {
    it("is identity if the function doesn't match", () =>
      Do(($) => {
        const ref = $(Ref.make(false))
        const result = $(
          ref.set(true)
            .as(42)
            .tapSome((): Maybe<Effect<never, never, never>> => Maybe.empty())
        )
        const effect = $(ref.get)
        assert.strictEqual(result, 42)
        assert.isTrue(effect)
      }).unsafeRunPromise())

    it("runs the effect if the function matches", () =>
      Do(($) => {
        const ref = $(Ref.make(0))
        const result = $(ref.set(10).as(42).tapSome((n) => Maybe.some(ref.set(n))))
        const effect = $(ref.get)
        assert.strictEqual(result, 42)
        assert.strictEqual(effect, 42)
      }).unsafeRunPromise())
  })
})

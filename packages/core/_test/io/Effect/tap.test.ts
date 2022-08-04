describe.concurrent("Effect", () => {
  describe.concurrent("tapErrorCause", () => {
    it("effectually peeks at the cause of the failure of this effect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("result", ({ ref }) =>
          Effect.dieMessage("die")
            .tapErrorCause(() => ref.set(true))
            .exit)
        .bind("effect", ({ ref }) => ref.get)

      const { effect, result } = await program.unsafeRunPromise()

      assert.isTrue(result.isFailure() && result.cause.dieMaybe.isSome())
      assert.isTrue(effect)
    })
  })

  describe.concurrent("tapDefect", () => {
    it("effectually peeks at the cause of the failure of this effect", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind("result", ({ ref }) =>
          Effect.dieMessage("die")
            .tapDefect(() => ref.set(true))
            .exit)
        .bind("effect", ({ ref }) => ref.get)

      const { effect, result } = await program.unsafeRunPromise()

      assert.isTrue(result.isFailure() && result.cause.dieMaybe.isSome())
      assert.isTrue(effect)
    })
  })

  describe.concurrent("tapEither", () => {
    it("effectually peeks at the failure of this effect", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          Effect.failSync(42)
            .tapEither((either) =>
              either.fold(
                (n) => ref.set(n),
                () => ref.set(-1)
              )
            )
            .exit
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })

    it("effectually peeks at the success of this effect", async () => {
      const program = Ref.make(0)
        .tap((ref) =>
          Effect.sync(42)
            .tapEither((either) =>
              either.fold(
                () => ref.set(-1),
                (n) => ref.set(n)
              )
            )
            .exit
        )
        .flatMap((ref) => ref.get)

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
    })
  })

  describe.concurrent("tapSome", () => {
    it("is identity if the function doesn't match", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(false))
        .bind(
          "result",
          ({ ref }) =>
            ref.set(true).as(42).tapSome((): Maybe<Effect<never, never, never>> => Maybe.empty())
        )
        .bind("effect", ({ ref }) => ref.get)

      const { effect, result } = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
      assert.isTrue(effect)
    })

    it("runs the effect if the function matches", async () => {
      const program = Effect.Do()
        .bind("ref", () => Ref.make(0))
        .bind("result", ({ ref }) =>
          ref
            .set(10)
            .as(42)
            .tapSome((n) => Maybe.some(ref.set(n))))
        .bind("effect", ({ ref }) => ref.get)

      const { effect, result } = await program.unsafeRunPromise()

      assert.strictEqual(result, 42)
      assert.strictEqual(effect, 42)
    })
  })
})

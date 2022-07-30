describe.concurrent("Effect", () => {
  describe.concurrent("acquireUseRelease", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.sync(42).acquireUseRelease(
            (n) => Effect.sync(n + 1),
            () => release.set(true)
          ))
        .bind("released", ({ release }) => release.get())

      const { released, result } = await program.unsafeRunPromise()

      assert.strictEqual(result, 43)
      assert.isTrue(released)
    })

    it("happy path + disconnect", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.sync(42).acquireUseRelease(
            (n) => Effect.sync(n + 1),
            () => release.set(true)
          ).disconnect)
        .bind("released", ({ release }) => release.get())

      const { released, result } = await program.unsafeRunPromise()

      assert.strictEqual(result, 43)
      assert.isTrue(released)
    })
  })

  describe.concurrent("acquireUseReleaseDiscard", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireUseReleaseDiscard(
            Effect.sync(42),
            Effect.sync(0),
            release.set(true)
          ))
        .bind("released", ({ release }) => release.get())

      const { released, result } = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
      assert.isTrue(released)
    })

    it("happy path + disconnect", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireUseReleaseDiscard(
            Effect.sync(42),
            Effect.sync(0),
            release.set(true)
          ).disconnect)
        .bind("released", ({ release }) => release.get())

      const { released, result } = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
      assert.isTrue(released)
    })
  })

  describe.concurrent("acquireReleaseExitWith", () => {
    it("happy path", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireUseReleaseExit(
            Effect.sync(42),
            () => Effect.sync(0),
            () => release.set(true)
          ).disconnect)
        .bind("released", ({ release }) => release.get())

      const { released, result } = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
      assert.isTrue(released)
    })

    it("error handling", async () => {
      const releaseDied = new RuntimeError("release died")
      const program = Effect.Do()
        .bind("exit", () =>
          Effect.acquireUseReleaseExit(
            Effect.sync(42),
            () => Effect.failSync("use failed"),
            () => Effect.die(releaseDied)
          ).exit)
        .flatMap(({ exit }) =>
          exit.foldEffect(
            (cause) => Effect.sync(cause),
            () => Effect.failSync("effect should have failed")
          )
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.failures == List("use failed"))
      assert.isTrue(result.defects == List(releaseDied))
    })

    it("happy path + disconnect", async () => {
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("result", ({ release }) =>
          Effect.acquireUseReleaseExit(
            Effect.sync(42),
            () => Effect.sync(0),
            () => release.set(true)
          ).disconnect)
        .bind("released", ({ release }) => release.get())

      const { released, result } = await program.unsafeRunPromise()

      assert.strictEqual(result, 0)
      assert.isTrue(released)
    })

    it("error handling + disconnect", async () => {
      const releaseDied = new RuntimeError("release died")
      const program = Effect.Do()
        .bind("exit", () =>
          Effect.acquireUseReleaseExit(
            Effect.sync(42),
            () => Effect.failSync("use failed"),
            () => Effect.die(releaseDied)
          )
            .disconnect
            .exit)
        .flatMap(({ exit }) =>
          exit.foldEffect(
            (cause) => Effect.sync(cause),
            () => Effect.failSync("effect should have failed")
          )
        )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result.failures == List("use failed"))
      assert.isTrue(result.defects == List(releaseDied))
    })

    it("beast mode error handling + disconnect", async () => {
      const releaseDied = new RuntimeError("release died")
      const program = Effect.Do()
        .bind("release", () => Ref.make(false))
        .bind("exit", ({ release }) =>
          Effect.acquireUseReleaseExit(
            Effect.sync(42),
            (): Effect<never, unknown, unknown> => {
              throw releaseDied
            },
            () => release.set(true)
          )
            .disconnect
            .exit)
        .bind("cause", ({ exit }) =>
          exit.foldEffect(
            (cause) => Effect.sync(cause),
            () => Effect.failSync("effect should have failed")
          ))
        .bind("released", ({ release }) => release.get())

      const { cause, released } = await program.unsafeRunPromise()

      assert.isTrue(cause.defects == List(releaseDied))
      assert.isTrue(released)
    })
  })
})

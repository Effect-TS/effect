describe.concurrent("Effect", () => {
  describe.concurrent("acquireUseRelease", () => {
    it("happy path", () =>
      Do(($) => {
        const release = $(Ref.make(false))
        const result = $(
          Effect.succeed(42).acquireUseRelease(
            (n) => Effect.sync(n + 1),
            () => release.set(true)
          )
        )
        const released = $(release.get)
        assert.strictEqual(result, 43)
        assert.isTrue(released)
      }).unsafeRunPromise())

    it("happy path + disconnect", () =>
      Do(($) => {
        const release = $(Ref.make(false))
        const result = $(
          Effect.sync(42).acquireUseRelease(
            (n) => Effect.succeed(n + 1),
            () => release.set(true)
          ).disconnect
        )
        const released = $(release.get)
        assert.strictEqual(result, 43)
        assert.isTrue(released)
      }).unsafeRunPromise())
  })

  describe.concurrent("acquireUseReleaseDiscard", () => {
    it("happy path", () =>
      Do(($) => {
        const release = $(Ref.make(false))
        const result = $(
          Effect.acquireUseReleaseDiscard(
            Effect.succeed(42),
            Effect.succeed(0),
            release.set(true)
          )
        )
        const released = $(release.get)
        assert.strictEqual(result, 0)
        assert.isTrue(released)
      }).unsafeRunPromise())

    it("happy path + disconnect", () =>
      Do(($) => {
        const release = $(Ref.make(false))
        const result = $(
          Effect.acquireUseReleaseDiscard(
            Effect.succeed(42),
            Effect.succeed(0),
            release.set(true)
          ).disconnect
        )
        const released = $(release.get)
        assert.strictEqual(result, 0)
        assert.isTrue(released)
      }).unsafeRunPromise())
  })

  describe.concurrent("acquireReleaseExitWith", () => {
    it("happy path", () =>
      Do(($) => {
        const release = $(Ref.make(false))
        const result = $(
          Effect.acquireUseReleaseExit(
            Effect.succeed(42),
            () => Effect.succeed(0),
            () => release.set(true)
          ).disconnect
        )
        const released = $(release.get)
        assert.strictEqual(result, 0)
        assert.isTrue(released)
      }).unsafeRunPromise())

    it("error handling", () =>
      Do(($) => {
        const releaseDied = new RuntimeError("release died")
        const exit = $(
          Effect.acquireUseReleaseExit(
            Effect.sync(42),
            () => Effect.fail("use failed"),
            () => Effect.dieSync(releaseDied)
          ).exit
        )
        const result = $(
          exit.foldEffect(
            Effect.succeed,
            () => Effect.fail("effect should have failed")
          )
        )
        assert.isTrue(result.failures == List("use failed"))
        assert.isTrue(result.defects == List(releaseDied))
      }).unsafeRunPromise())

    it("happy path + disconnect", () =>
      Do(($) => {
        const release = $(Ref.make(false))
        const result = $(
          Effect.acquireUseReleaseExit(
            Effect.succeed(42),
            () => Effect.succeed(0),
            () => release.set(true)
          ).disconnect
        )
        const released = $(release.get)
        assert.strictEqual(result, 0)
        assert.isTrue(released)
      }).unsafeRunPromise())

    it("error handling + disconnect", () =>
      Do(($) => {
        const releaseDied = new RuntimeError("release died")
        const exit = $(
          Effect.acquireUseReleaseExit(
            Effect.sync(42),
            () => Effect.fail("use failed"),
            () => Effect.dieSync(releaseDied)
          ).disconnect.exit
        )
        const result = $(
          exit.foldEffect(
            Effect.succeed,
            () => Effect.fail("effect should have failed")
          )
        )
        assert.isTrue(result.failures == List("use failed"))
        assert.isTrue(result.defects == List(releaseDied))
      }).unsafeRunPromise())

    it("beast mode error handling + disconnect", () =>
      Do(($) => {
        const releaseDied = new RuntimeError("release died")
        const release = $(Ref.make(false))
        const exit = $(
          Effect.acquireUseReleaseExit(
            Effect.succeed(42),
            (): Effect<never, unknown, unknown> => {
              throw releaseDied
            },
            () => release.set(true)
          ).disconnect.exit
        )
        const result = $(
          exit.foldEffect(
            Effect.succeed,
            () => Effect.fail("effect should have failed")
          )
        )
        const released = $(release.get)
        assert.isTrue(result.defects == List(releaseDied))
        assert.isTrue(released)
      }).unsafeRunPromise())
  })
})

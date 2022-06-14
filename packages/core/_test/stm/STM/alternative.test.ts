describe.concurrent("STM", () => {
  describe.concurrent("orElse", () => {
    it("tries alternative once left retries", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.update((n) => n + 100) > STM.retry)
        .bindValue("right", ({ tRef }) => tRef.update((n) => n + 200))
        .tap(({ left, right }) => (left | right).commit())
        .flatMap(({ tRef }) => tRef.get.commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 200)
    })

    it("tries alternative once left fails", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.update((n) => n + 100) > STM.fail("boom"))
        .bindValue("right", ({ tRef }) => tRef.update((n) => n + 200))
        .tap(({ left, right }) => (left | right).commit())
        .flatMap(({ tRef }) => tRef.get.commit())

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, 200)
    })

    it("fail if alternative fails", async () => {
      const program = (STM.fail("left") | STM.fail("right")).commit()

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail("right"))
    })
  })

  describe.concurrent("orElseEither", () => {
    it("returns result of the first successful transaction wrapped in either", async () => {
      const program = Effect.struct({
        rightValue: STM.retry.orElseEither(STM.succeed(42)).commit(),
        leftValue1: STM.succeed(1).orElseEither(STM.succeed("nope")).commit(),
        leftValue2: STM.succeed(2).orElseEither(STM.retry).commit()
      })

      const { leftValue1, leftValue2, rightValue } = await program.unsafeRunPromise()

      assert.isTrue(rightValue == Either.right(42))
      assert.isTrue(leftValue1 == Either.left(1))
      assert.isTrue(leftValue2 == Either.left(2))
    })
  })

  describe.concurrent("orElseFail", () => {
    it("tries left first", async () => {
      const program = STM.succeed(true).orElseFail(false).commit()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("fails with the specified error once left retries", async () => {
      const program = STM.retry.orElseFail(false).either.commit()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(false))
    })

    it("fails with the specified error once left fails", async () => {
      const program = STM.fail(true).orElseFail(false).either.commit()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result == Either.left(false))
    })
  })

  describe.concurrent("orElseSucceed", () => {
    it("tries left first", async () => {
      const program = STM.succeed(true).orElseSucceed(false).commit()

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("succeeds with the specified value if left retries", async () => {
      const program = STM.retry.orElseSucceed(false).commit()

      const result = await program.unsafeRunPromise()

      assert.isFalse(result)
    })

    it("succeeds with the specified value if left fails", async () => {
      const program = STM.fail(true).orElseSucceed(false).commit()

      const result = await program.unsafeRunPromise()

      assert.isFalse(result)
    })
  })

  describe.concurrent("alternative", () => {
    it("succeeds if left succeeds", async () => {
      const program = STM.succeed("left").orTry(STM.succeed("right")).commit()

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "left")
    })

    it("succeeds if right succeeds", async () => {
      const program = STM.retry.orTry(STM.succeed("right")).commit()

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "right")
    })

    it("retries left after right retries", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.get.flatMap((n) => STM.check(n > 500).as("left")))
        .bindValue("right", () => STM.retry)
        .bindValue("updater", ({ tRef }) =>
          tRef
            .update((n) => n + 10)
            .commit()
            .forever())
        .flatMap(({ left, right, updater }) => left.orTry(right).commit().race(updater))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "left")
    })

    it("fails if left fails", async () => {
      const program = STM.fail("left").orTry(STM.succeed("right")).commit()

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail("left"))
    })

    it("fails if right fails", async () => {
      const program = STM.retry.orTry(STM.fail("right")).commit()

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result.untraced == Exit.fail("right"))
    })
  })
})

describe.concurrent("orElse", () => {
  describe.concurrent("orElse", () => {
    it("does not recover from defects", async () => {
      const error = new Error("died")
      const fiberId = FiberId(0, 123)
      const program = Effect.Do()
        .bind("plain", () => (Effect.die(error) | Effect.unit).exit)
        .bind("both", () =>
          (
            Effect.failCauseSync(Cause.both(Cause.interrupt(fiberId), Cause.die(error))) |
            Effect.unit
          ).exit)
        .bind("then", () =>
          (
            Effect.failCauseSync(Cause.then(Cause.interrupt(fiberId), Cause.die(error))) |
            Effect.unit
          ).exit)
        .bind("fail", () => (Effect.failSync(error) | Effect.unit).exit)

      const { both, fail, plain, then } = await program.unsafeRunPromise()

      assert.isTrue(plain == Exit.die(error))
      assert.isTrue(both == Exit.die(error))
      assert.isTrue(then == Exit.die(error))
      assert.isTrue(fail == Exit.succeed(undefined))
    })

    it("left failed and right died with kept cause", async () => {
      const z1 = Effect.failSync(new Error("1"))
      const z2 = Effect.die(new Error("2"))
      const program = (z1 | z2).catchAllCause((cause) =>
        cause.isDieType()
          ? Effect.sync((cause.value as Error).message === "2")
          : Effect.sync(false)
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("left failed and right failed with kept cause", async () => {
      const z1 = Effect.failSync(new Error("1"))
      const z2 = Effect.failSync(new Error("2"))
      const program = (z1 | z2).catchAllCause((cause) =>
        cause.isFailType()
          ? Effect.sync((cause.value as Error).message === "2")
          : Effect.sync(false)
      )

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    // TODO(Mike/Max): implement once Gen has been implemented
    // it("is associative", async () => {
    //   val smallInts = Gen.int(0, 100)
    //   val causes    = Gen.causes(smallInts, Gen.throwable)
    //   val successes = Gen.successes(smallInts)
    //   val exits     = Gen.either()(causes, successes).map(_.fold(Exit.failCause, Exit.succeed))
    //   check(exits, exits, exits) { (exit()1, exit()2, exit()3) =>
    //     val zio1  = ZIO.done(exit()1)
    //     val zio2  = ZIO.done(exit()2)
    //     val zio3  = ZIO.done(exit()3)
    //     val left  = (zio1 orElse zio2) orElse zio3
    //     val right = zio1 orElse (zio2 orElse zio3)
    //     for {
    //       left  <- left.exit()
    //       right <- right.exit()
    //     } yield assert(left)(equalTo(right))
    //   }
    // })
  })

  describe.concurrent("orElseFail", () => {
    it("executes this effect and returns its value if it succeeds", async () => {
      const program = Effect.sync(true).orElseFail(false)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("otherwise fails with the specified error", async () => {
      const program = Effect.failSync(false).orElseFail(true).flip

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })

  describe.concurrent("orElseOptional", () => {
    it("produces the value of this effect if it succeeds", async () => {
      const program = Effect.sync("succeed").orElseOptional(Effect.sync("orElse"))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "succeed")
    })

    it("produces the value of this effect if it fails with some error", async () => {
      const program = Effect.failSync(Maybe.some("fail")).orElseOptional(
        Effect.sync("orElse")
      )

      const result = await program.unsafeRunPromiseExit()

      assert.isTrue(result == Exit.fail(Maybe.some("fail")))
    })

    it("produces the value of the specified effect if it fails with none", async () => {
      const program = Effect.failSync(Maybe.none).orElseOptional(Effect.sync("orElse"))

      const result = await program.unsafeRunPromise()

      assert.strictEqual(result, "orElse")
    })
  })

  describe.concurrent("orElseSucceed", () => {
    it("executes this effect and returns its value if it succeeds", async () => {
      const program = Effect.sync(true).orElseSucceed(false)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })

    it("otherwise succeeds with the specified value", async () => {
      const program = Effect.failSync(false).orElseSucceed(true)

      const result = await program.unsafeRunPromise()

      assert.isTrue(result)
    })
  })
})

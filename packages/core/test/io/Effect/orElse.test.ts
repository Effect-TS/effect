describe.concurrent("orElse", () => {
  describe.concurrent("orElse", () => {
    it("does not recover from defects", () =>
      Do(($) => {
        const error = new Error("died")
        const fiberId = FiberId(0, 123)
        const bothCause = Cause.both(Cause.interrupt(fiberId), Cause.die(error))
        const thenCause = Cause.then(Cause.interrupt(fiberId), Cause.die(error))
        const plain = $(Effect.dieSync(error).orElse(Effect.unit).exit)
        const both = $(Effect.failCause(bothCause).orElse(Effect.unit).exit)
        const then = $(Effect.failCause(thenCause).orElse(Effect.unit).exit)
        const fail = $(Effect.failSync(error).orElse(Effect.unit).exit)
        assert.isTrue(plain == Exit.die(error))
        assert.isTrue(both == Exit.die(error))
        assert.isTrue(then == Exit.die(error))
        assert.isTrue(fail == Exit.succeed(undefined))
      }).unsafeRunPromiseExit())

    it("left failed and right died with kept cause", () =>
      Do(($) => {
        const z1 = Effect.failSync(new Error("1"))
        const z2 = Effect.dieSync(new Error("2"))
        const result = $(
          z1.orElse(z2).catchAllCause((cause) =>
            cause.isDieType()
              ? Effect.sync((cause.value as Error).message === "2")
              : Effect.sync(false)
          )
        )
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("left failed and right failed with kept cause", () =>
      Do(($) => {
        const z1 = Effect.failSync(new Error("1"))
        const z2 = Effect.failSync(new Error("2"))
        const result = $(
          z1.orElse(z2).catchAllCause((cause) =>
            cause.isFailType()
              ? Effect.sync((cause.value as Error).message === "2")
              : Effect.sync(false)
          )
        )
        assert.isTrue(result)
      }).unsafeRunPromise())

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
    it("executes this effect and returns its value if it succeeds", () =>
      Do(($) => {
        const result = $(Effect.sync(true).orElseFail(false))
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("otherwise fails with the specified error", () =>
      Do(($) => {
        const result = $(Effect.failSync(false).orElseFail(true).flip)
        assert.isTrue(result)
      }).unsafeRunPromise())
  })

  describe.concurrent("orElseOptional", () => {
    it("produces the value of this effect if it succeeds", () =>
      Do(($) => {
        const result = $(Effect.sync("succeed").orElseOptional(Effect.sync("orElse")))
        assert.strictEqual(result, "succeed")
      }).unsafeRunPromise())

    it("produces the value of this effect if it fails with some error", () =>
      Do(($) => {
        const result = $(
          Effect.failSync(Maybe.some("fail")).orElseOptional(Effect.sync("orElse")).exit
        )
        assert.isTrue(result == Exit.fail(Maybe.some("fail")))
      }).unsafeRunPromiseExit())

    it("produces the value of the specified effect if it fails with none", () =>
      Do(($) => {
        const result = $(Effect.failSync(Maybe.none).orElseOptional(Effect.sync("orElse")))
        assert.strictEqual(result, "orElse")
      }).unsafeRunPromise())
  })

  describe.concurrent("orElseSucceed", () => {
    it("executes this effect and returns its value if it succeeds", () =>
      Do(($) => {
        const result = $(Effect.sync(true).orElseSucceed(false))
        assert.isTrue(result)
      }).unsafeRunPromise())

    it("otherwise succeeds with the specified value", () =>
      Do(($) => {
        const result = $(Effect.failSync(false).orElseSucceed(true))
        assert.isTrue(result)
      }).unsafeRunPromise())
  })
})

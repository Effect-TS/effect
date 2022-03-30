import { Option } from "../../../src/data/Option"
import { Cause } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { FiberId } from "../../../src/io/FiberId"
import { TraceElement } from "../../../src/io/TraceElement"

describe("orElse", () => {
  describe("orElse", () => {
    it("does not recover from defects", async () => {
      const error = new Error("died")
      const fiberId = FiberId(0, 123, TraceElement.empty)
      const program = Effect.Do()
        .bind("plain", () => (Effect.die(error) | Effect.unit).exit())
        .bind("both", () =>
          (
            Effect.failCause(Cause.both(Cause.interrupt(fiberId), Cause.die(error))) |
            Effect.unit
          ).exit()
        )
        .bind("then", () =>
          (
            Effect.failCause(Cause.then(Cause.interrupt(fiberId), Cause.die(error))) |
            Effect.unit
          ).exit()
        )
        .bind("fail", () => (Effect.fail(error) | Effect.unit).exit())

      const { both, fail, plain, then } = await program.unsafeRunPromise()

      expect(plain.untraced()).toEqual(Exit.die(error))
      expect(both.untraced()).toEqual(Exit.die(error))
      expect(then.untraced()).toEqual(Exit.die(error))
      expect(fail.untraced()).toEqual(Exit.succeed(undefined))
    })

    it("left failed and right died with kept cause", async () => {
      const z1 = Effect.fail(new Error("1"))
      const z2 = Effect.die(new Error("2"))
      const program = (z1 | z2).catchAllCause((cause) =>
        cause.isDieType()
          ? Effect.succeed((cause.value as Error).message === "2")
          : Effect.succeed(false)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("left failed and right failed with kept cause", async () => {
      const z1 = Effect.fail(new Error("1"))
      const z2 = Effect.fail(new Error("2"))
      const program = (z1 | z2).catchAllCause((cause) =>
        cause.isFailType()
          ? Effect.succeed((cause.value as Error).message === "2")
          : Effect.succeed(false)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    // TODO(Mike/Max): implement once Gen has been implemented
    // it("is associative", async () => {
    //   val smallInts = Gen.int(0, 100)
    //   val causes    = Gen.causes(smallInts, Gen.throwable)
    //   val successes = Gen.successes(smallInts)
    //   val exits     = Gen.either(causes, successes).map(_.fold(Exit.failCause, Exit.succeed))
    //   check(exits, exits, exits) { (exit1, exit2, exit3) =>
    //     val zio1  = ZIO.done(exit1)
    //     val zio2  = ZIO.done(exit2)
    //     val zio3  = ZIO.done(exit3)
    //     val left  = (zio1 orElse zio2) orElse zio3
    //     val right = zio1 orElse (zio2 orElse zio3)
    //     for {
    //       left  <- left.exit
    //       right <- right.exit
    //     } yield assert(left)(equalTo(right))
    //   }
    // })
  })

  describe("orElseFail", () => {
    it("executes this effect and returns its value if it succeeds", async () => {
      const program = Effect.succeed(true).orElseFail(false)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("otherwise fails with the specified error", async () => {
      const program = Effect.fail(false).orElseFail(true).flip()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("orElseOptional", () => {
    it("produces the value of this effect if it succeeds", async () => {
      const program = Effect.succeed("succeed").orElseOptional(Effect.succeed("orElse"))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("succeed")
    })

    it("produces the value of this effect if it fails with some error", async () => {
      const program = Effect.fail(Option.some("fail")).orElseOptional(
        Effect.succeed("orElse")
      )

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.some("fail")))
    })

    it("produces the value of the specified effect if it fails with none", async () => {
      const program = Effect.fail(Option.none).orElseOptional(Effect.succeed("orElse"))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("orElse")
    })
  })

  describe("orElseSucceed", () => {
    it("executes this effect and returns its value if it succeeds", async () => {
      const program = Effect.succeed(true).orElseSucceed(false)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("otherwise succeeds with the specified value", async () => {
      const program = Effect.fail(false).orElseSucceed(true)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })
})

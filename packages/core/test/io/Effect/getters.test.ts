import { Either } from "../../../src/data/Either"
import { identity } from "../../../src/data/Function"
import { NoSuchElementException } from "../../../src/data/GlobalExceptions"
import { Option } from "../../../src/data/Option"
import { RuntimeError } from "../../../src/io/Cause"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"
import { ExampleError } from "./test-utils"

describe("Effect", () => {
  describe("isFailure", () => {
    it("returns true when the effect is a failure", async () => {
      const program = Effect.fail("fail").isFailure()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("returns false when the effect is a success", async () => {
      const program = Effect.succeed("succeed").isFailure()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })
  })

  describe("isSuccess", () => {
    it("returns false when the effect is a failure", async () => {
      const program = Effect.fail("fail").isSuccess()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("returns true when the effect is a success", async () => {
      const program = Effect.succeed("succeed").isSuccess()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("left", () => {
    it("on Left value", async () => {
      const program = Effect.succeed(Either.left("left")).left

      const result = await program.unsafeRunPromise()

      expect(result).toEqual("left")
    })

    it("on Right value", async () => {
      const program = Effect.succeed(Either.right("right")).left

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Either.right("right")))
    })

    it("on failure", async () => {
      const program = Effect.fail("fail").left

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Either.left("fail")))
    })
  })

  describe("right", () => {
    it("on Right value", async () => {
      const program = Effect.succeed(Either.right("right")).right

      const result = await program.unsafeRunPromise()

      expect(result).toBe("right")
    })

    it("on Left value", async () => {
      const program = Effect.succeed(Either.left("left")).right

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Either.left("left")))
    })

    it("on failure", async () => {
      const program = Effect.fail("fail").right

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Either.right("fail")))
    })
  })

  describe("some", () => {
    it("extracts the value from Some", async () => {
      const program = Effect.succeed(Option.some(1)).some

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("fails on None", async () => {
      const program = Effect.succeed(Option.none).some

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.none))
    })

    it("fails when given an exception", async () => {
      const error = new RuntimeError("failed")
      const program = Effect.fail(error).some

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.some(error)))
    })
  })

  describe("none", () => {
    it("on Some fails with None", async () => {
      const program = Effect.succeed(Option.some(1)).none

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.none))
    })

    it("on None succeeds with undefined", async () => {
      const program = Effect.succeed(Option.none).none

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("fails with Some(ex) when effect fails with ex", async () => {
      const error = new RuntimeError("failed task")
      const program = Effect.fail(error).none

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(Option.some(error)))
    })
  })

  describe("noneOrFail", () => {
    it("on None succeeds with Unit", async () => {
      const program = Effect.noneOrFail(Option.none)

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("on Some fails", async () => {
      const program = Effect.noneOrFail(Option.some("some")).catchAll(Effect.succeedNow)

      const result = await program.unsafeRunPromise()

      expect(result).toBe("some")
    })
  })

  describe("noneOrFailWith", () => {
    it("on None succeeds with Unit", async () => {
      const program = Effect.noneOrFailWith(Option.none, identity)

      const result = await program.unsafeRunPromise()

      expect(result).toBeUndefined()
    })

    it("on Some fails", async () => {
      const program = Effect.noneOrFailWith(Option.some("some"), (s) => s + s).catchAll(
        Effect.succeedNow
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe("somesome")
    })
  })

  describe("someOrElse", () => {
    it("extracts the value from Some", async () => {
      const program = Effect.succeed(Option.some(1)).someOrElse(42)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("falls back to the default value if None", async () => {
      const program = Effect.succeed(Option.none).someOrElse(42)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("does not change failed state", async () => {
      const program = Effect.fail(ExampleError).someOrElse(42)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })
  })

  describe("someOrElseEffect", () => {
    it("extracts the value from Some", async () => {
      const program = Effect.succeed(Option.some(1)).someOrElseEffect(
        Effect.succeed(42)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("falls back to the default effect if None", async () => {
      const program = Effect.succeed(Option.none).someOrElseEffect(Effect.succeed(42))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("does not change failed state", async () => {
      const program = Effect.fail(ExampleError).someOrElseEffect(Effect.succeed(42))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })
  })

  describe("someOrFail", () => {
    it("extracts the optional value", async () => {
      const program = Effect.succeed(Option.some(42)).someOrFail(ExampleError)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("fails when given a None", async () => {
      const program = Effect.succeed(Option.none).someOrFail(ExampleError)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })
  })

  describe("getOrFailDiscard", () => {
    it("basic option test", async () => {
      const program = Effect.getOrFailDiscard(Option.some("foo"))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("foo")
    })

    it("side effect unit in option test", async () => {
      const program = Effect.getOrFailDiscard(Option.none).catchAll(() =>
        Effect.succeed("controlling unit side-effect")
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe("controlling unit side-effect")
    })
  })

  describe("option", () => {
    it("return success in Some", async () => {
      const program = Effect.succeed(11).option()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(11))
    })

    it("return failure as None", async () => {
      const program = Effect.fail(123).option()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("not catch throwable", async () => {
      const program = Effect.die(ExampleError).option()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })

    it("catch throwable after sandboxing", async () => {
      const program = Effect.die(ExampleError).sandbox().option()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("unsome", () => {
    it("fails when given Some error", async () => {
      const program = Effect.fail(Option.some("error")).unsome()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("error"))
    })

    it("succeeds with None given None error", async () => {
      const program = Effect.fail(Option.none).unsome()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("succeeds with Some given a value", async () => {
      const program = Effect.succeed(1).unsome()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(1))
    })
  })

  describe("getOrFail", () => {
    it("make a task from a defined option", async () => {
      const program = Effect.getOrFail(Option.some(1))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("make a task from an empty option", async () => {
      const program = Effect.getOrFail(Option.none)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(new NoSuchElementException()))
    })
  })

  describe("someOrFailException", () => {
    it("extracts the optional value", async () => {
      const program = Effect.some(42).someOrFailException()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })

    it("fails when given a None", async () => {
      const program = Effect.succeed(Option.none).someOrFailException()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(new NoSuchElementException()))
    })
  })

  describe("unleft", () => {
    it("should handle successes with right", async () => {
      const effect = Effect.succeed(Either.right(42))
      const program = Effect.Do()
        .bind("actual", () => effect.left.unleft().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })

    it("should handle successes with left", async () => {
      const effect = Effect.succeed(Either.left(42))
      const program = Effect.Do()
        .bind("actual", () => effect.left.unleft().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })

    it("should handle failures", async () => {
      const effect = Effect.fail(42)
      const program = Effect.Do()
        .bind("actual", () => effect.left.unleft().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })
  })

  describe("unright", () => {
    it("should handle successes with right", async () => {
      const effect = Effect.succeed(Either.right(42))
      const program = Effect.Do()
        .bind("actual", () => effect.right.unright().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })

    it("should handle successes with left", async () => {
      const effect = Effect.succeed(Either.left(42))
      const program = Effect.Do()
        .bind("actual", () => effect.right.unright().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })

    it("should handle failures", async () => {
      const effect = Effect.fail(42)
      const program = Effect.Do()
        .bind("actual", () => effect.right.unright().exit())
        .bind("expected", () => effect.exit())

      const { actual, expected } = await program.unsafeRunPromise()

      expect(actual.untraced()).toEqual(expected.untraced())
    })
  })
})

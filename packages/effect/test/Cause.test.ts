import * as Cause from "effect/Cause"
import * as Equal from "effect/Equal"
import * as fc from "effect/FastCheck"
import * as FiberId from "effect/FiberId"
import * as Hash from "effect/Hash"
import * as internal from "effect/internal/cause"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import { causes, equalCauses, errorCauseFunctions, errors } from "effect/test/utils/cause"
import { assert, describe, expect, it } from "vitest"

describe("Cause", () => {
  describe("InterruptedException", () => {
    it("toString() and NodeInspectSymbol implementation", () => {
      // The following line should be referenced in the test below
      const ex = new Cause.InterruptedException("my message")
      expect(ex.toString()).include("InterruptedException: my message")
      if (typeof window === "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { inspect } = require("node:util")
        expect(inspect(ex)).include("Cause.test.ts:16") // <= reference to the line above
      }
    })
  })

  it("[internal] prettyErrorMessage", () => {
    class Error1 {
      readonly _tag = "WithTag"
    }
    expect(internal.prettyErrorMessage(new Error1())).toEqual(`{"_tag":"WithTag"}`)
    class Error2 {
      readonly _tag = "WithMessage"
      readonly message = "my message"
    }
    expect(internal.prettyErrorMessage(new Error2())).toEqual(`{"_tag":"WithMessage","message":"my message"}`)
    class Error3 {
      readonly _tag = "WithName"
      readonly name = "my name"
    }
    expect(internal.prettyErrorMessage(new Error3())).toEqual(
      `{"_tag":"WithName","name":"my name"}`
    )
    class Error4 {
      readonly _tag = "WithName"
      readonly name = "my name"
      readonly message = "my message"
    }
    expect(internal.prettyErrorMessage(new Error4())).toEqual(
      `{"_tag":"WithName","name":"my name","message":"my message"}`
    )
    class Error5 {
      readonly _tag = "WithToString"
      toString() {
        return "Error: my string"
      }
    }
    expect(internal.prettyErrorMessage(new Error5())).toEqual(
      `Error: my string`
    )
  })

  describe("pretty", () => {
    it("doesn't blow up on array errors", () => {
      assert.strictEqual(Cause.pretty(Cause.fail([{ toString: "" }])), `Error: [{"toString":""}]`)
    })

    it("Empty", () => {
      expect(Cause.pretty(Cause.empty)).toEqual("All fibers interrupted without errors.")
    })

    it("Fail", () => {
      class Error1 {
        readonly _tag = "WithTag"
      }
      expect(Cause.pretty(Cause.fail(new Error1()))).toEqual(`Error: {"_tag":"WithTag"}`)
      class Error2 {
        readonly _tag = "WithMessage"
        readonly message = "my message"
      }
      expect(Cause.pretty(Cause.fail(new Error2()))).toEqual(`Error: {"_tag":"WithMessage","message":"my message"}`)
      class Error3 {
        readonly _tag = "WithName"
        readonly name = "my name"
      }
      expect(Cause.pretty(Cause.fail(new Error3()))).toEqual(`Error: {"_tag":"WithName","name":"my name"}`)
      class Error4 {
        readonly _tag = "WithName"
        readonly name = "my name"
        readonly message = "my message"
      }
      expect(Cause.pretty(Cause.fail(new Error4()))).toEqual(
        `Error: {"_tag":"WithName","name":"my name","message":"my message"}`
      )
      class Error5 {
        readonly _tag = "WithToString"
        toString() {
          return "my string"
        }
      }
      expect(Cause.pretty(Cause.fail(new Error5()))).toEqual(`Error: my string`)
    })

    it("Interrupt", () => {
      expect(Cause.pretty(Cause.interrupt(FiberId.none))).toEqual("All fibers interrupted without errors.")
      expect(Cause.pretty(Cause.interrupt(FiberId.runtime(1, 0)))).toEqual(
        "All fibers interrupted without errors."
      )
      expect(Cause.pretty(Cause.interrupt(FiberId.composite(FiberId.none, FiberId.runtime(1, 0))))).toEqual(
        "All fibers interrupted without errors."
      )
    })
  })

  describe("toJSON", () => {
    it("Empty", () => {
      expect(Cause.empty.toJSON()).toEqual({
        _id: "Cause",
        _tag: "Empty"
      })
    })

    it("Fail", () => {
      expect(Cause.fail(Option.some(1)).toJSON()).toEqual({
        _id: "Cause",
        _tag: "Fail",
        failure: {
          _id: "Option",
          _tag: "Some",
          value: 1
        }
      })
    })

    it("Die", () => {
      expect(Cause.die(Option.some(1)).toJSON()).toEqual({
        _id: "Cause",
        _tag: "Die",
        defect: {
          _id: "Option",
          _tag: "Some",
          value: 1
        }
      })
    })

    it("Interrupt", () => {
      expect(Cause.interrupt(FiberId.none).toJSON()).toEqual({
        _id: "Cause",
        _tag: "Interrupt",
        fiberId: {
          _id: "FiberId",
          _tag: "None"
        }
      })
      expect(Cause.interrupt(FiberId.runtime(1, 0)).toJSON()).toEqual({
        _id: "Cause",
        _tag: "Interrupt",
        fiberId: {
          _id: "FiberId",
          _tag: "Runtime",
          id: 1,
          startTimeMillis: 0
        }
      })
      expect(Cause.interrupt(FiberId.composite(FiberId.none, FiberId.runtime(1, 0))).toJSON()).toEqual({
        _id: "Cause",
        _tag: "Interrupt",
        fiberId: {
          _id: "FiberId",
          _tag: "Composite",
          left: {
            _id: "FiberId",
            _tag: "None"
          },
          right: {
            _id: "FiberId",
            _tag: "Runtime",
            id: 1,
            startTimeMillis: 0
          }
        }
      })
    })

    it("Sequential", () => {
      expect(Cause.sequential(Cause.fail("failure 1"), Cause.fail("failure 2")).toJSON()).toStrictEqual({
        _id: "Cause",
        _tag: "Sequential",
        left: {
          _id: "Cause",
          _tag: "Fail",
          failure: "failure 1"
        },
        right: {
          _id: "Cause",
          _tag: "Fail",
          failure: "failure 2"
        }
      })
    })

    it("Parallel", () => {
      expect(Cause.parallel(Cause.fail("failure 1"), Cause.fail("failure 2")).toJSON()).toStrictEqual({
        _id: "Cause",
        _tag: "Parallel",
        left: {
          _id: "Cause",
          _tag: "Fail",
          failure: "failure 1"
        },
        right: {
          _id: "Cause",
          _tag: "Fail",
          failure: "failure 2"
        }
      })
    })
  })

  describe("toString", () => {
    it("Empty", () => {
      expect(String(Cause.empty)).toEqual(`All fibers interrupted without errors.`)
    })

    it("Fail", () => {
      expect(String(Cause.fail("my failure"))).toEqual(`Error: my failure`)
      expect(String(Cause.fail(new Error("my failure")))).includes(`Error: my failure`)
    })

    it("Die", () => {
      expect(String(Cause.die("die message"))).toEqual(`Error: die message`)
      expect(String(Cause.die(new Error("die message")))).includes(`Error: die message`)
    })

    it("Interrupt", () => {
      expect(String(Cause.interrupt(FiberId.none))).toEqual(`All fibers interrupted without errors.`)
      expect(String(Cause.interrupt(FiberId.runtime(1, 0)))).toEqual(`All fibers interrupted without errors.`)
      expect(String(Cause.interrupt(FiberId.composite(FiberId.none, FiberId.runtime(1, 0))))).toEqual(
        `All fibers interrupted without errors.`
      )
    })

    it("Sequential", () => {
      expect(String(Cause.sequential(Cause.fail("failure 1"), Cause.fail("failure 2")))).toEqual(
        `Error: failure 1\nError: failure 2`
      )
      const actual = String(Cause.sequential(Cause.fail(new Error("failure 1")), Cause.fail(new Error("failure 2"))))
      expect(actual).includes("Error: failure 1")
      expect(actual).includes("Error: failure 2")
    })

    it("Parallel", () => {
      expect(String(Cause.parallel(Cause.fail("failure 1"), Cause.fail("failure 2")))).toEqual(
        `Error: failure 1\nError: failure 2`
      )
      const actual = String(
        String(Cause.parallel(Cause.fail(new Error("failure 1")), Cause.fail(new Error("failure 2"))))
      )
      expect(actual).includes("Error: failure 1")
      expect(actual).includes("Error: failure 2")
    })
  })

  describe("Equal.symbol implementation", () => {
    it("should compare for equality by value", () => {
      assert.isTrue(Equal.equals(Cause.fail(0), Cause.fail(0)))
      assert.isTrue(Equal.equals(Cause.die(0), Cause.die(0)))
      assert.isFalse(Equal.equals(Cause.fail(0), Cause.fail(1)))
      assert.isFalse(Equal.equals(Cause.die(0), Cause.die(1)))
    })

    it("should be symmetric", () => {
      fc.assert(fc.property(causes, causes, (causeA, causeB) => {
        assert.strictEqual(
          Equal.equals(causeA, causeB),
          Equal.equals(causeB, causeA)
        )
      }))
    })

    it("equal causes should generate equals hashes", () => {
      fc.assert(fc.property(equalCauses, ([causeA, causeB]) => {
        assert.strictEqual(Hash.hash(causeA), Hash.hash(causeB))
      }))
    })

    it("should keep account for the failure type", () => {
      expect(Equal.equals(Cause.die(0), Cause.fail(0))).toBe(false)
      expect(
        Equal.equals(
          Cause.parallel(Cause.fail("fail1"), Cause.die("fail2")),
          Cause.parallel(Cause.fail("fail2"), Cause.die("fail1"))
        )
      ).toBe(false)
    })
  })

  it("`isDie` and `keepDefects` should be consistent", () => {
    fc.assert(fc.property(causes, (cause) => {
      const result = Cause.keepDefects(cause)
      if (Cause.isDie(cause)) {
        assert.isTrue(Option.isSome(result))
      } else {
        assert.isTrue(Option.isNone(result))
      }
    }))
  })

  it("`failures` should be stack safe", () => {
    const n = 10_000
    const cause = Array.from({ length: n - 1 }, () => Cause.fail("fail")).reduce(Cause.parallel, Cause.fail("fail"))
    const result = Cause.failures(cause)
    assert.strictEqual(Array.from(result).length, n)
  })

  describe("flatMap", () => {
    it("left identity", () => {
      fc.assert(fc.property(causes, (cause) => {
        const left = cause.pipe(Cause.flatMap(Cause.fail))
        const right = cause
        assert.isTrue(Equal.equals(left, right))
      }))
    })

    it("right identity", () => {
      fc.assert(fc.property(errors, errorCauseFunctions, (error, f) => {
        const left = Cause.fail(error).pipe(Cause.flatMap(f))
        const right = f(error)
        assert.isTrue(Equal.equals(left, right))
      }))
    })

    it("associativity", () => {
      fc.assert(fc.property(causes, errorCauseFunctions, errorCauseFunctions, (cause, f, g) => {
        const left = cause.pipe(Cause.flatMap(f), Cause.flatMap(g))
        const right = cause.pipe(Cause.flatMap((error) => f(error).pipe(Cause.flatMap(g))))
        assert.isTrue(Equal.equals(left, right))
      }))
    })
  })

  it("andThen", () => {
    const err1 = Cause.fail("err1")
    const err2 = Cause.fail("err2")
    expect(err1.pipe(Cause.andThen(() => err2))).toStrictEqual(err2)
    expect(err1.pipe(Cause.andThen(err2))).toStrictEqual(err2)
    expect(Cause.andThen(err1, () => err2)).toStrictEqual(err2)
    expect(Cause.andThen(err1, err2)).toStrictEqual(err2)
  })

  describe("stripSomeDefects", () => {
    it("returns `Some` with remaining causes", () => {
      const cause1 = Cause.die({
        _tag: "NumberFormatException",
        msg: "can't parse to int"
      })
      const cause2 = Cause.die({
        _tag: "ArithmeticException",
        msg: "division by zero"
      })
      const cause = Cause.parallel(cause1, cause2)
      const stripped = cause.pipe(
        Cause.stripSomeDefects((defect) =>
          Predicate.isTagged(defect, "NumberFormatException")
            ? Option.some(defect) :
            Option.none()
        )
      )
      assert.isTrue(Equal.equals(stripped, Option.some(cause2)))
    })

    it("returns `None` if there are no remaining causes", () => {
      const cause = Cause.die({ _tag: "NumberFormatException", msg: "can't parse to int" })
      const stripped = cause.pipe(
        Cause.stripSomeDefects((defect) =>
          Predicate.isTagged(defect, "NumberFormatException")
            ? Option.some(defect) :
            Option.none()
        )
      )
      assert.isTrue(Equal.equals(stripped, Option.none()))
    })
  })

  describe("UnknownException", () => {
    it("should have an `error` property", () => {
      const err1 = new Cause.UnknownException("my message")
      expect(err1.error).toEqual("my message")
      const err2 = new Cause.UnknownException(new Error("my error"))
      expect(err2.error).toBeInstanceOf(Error)
      expect((err2.error as Error).message).toEqual("my error")
    })

    it("should have a `cause` property", () => {
      const err1 = new Cause.UnknownException("my message")
      expect(err1.cause).toEqual("my message")
      const err2 = new Cause.UnknownException(new Error("my error"))
      expect(err2.cause).toBeInstanceOf(Error)
      expect((err2.cause as Error).message).toEqual("my error")
    })

    it("should set a default message", () => {
      const err1 = new Cause.UnknownException("my message")
      expect(err1.message).toEqual("An unknown error occurred")
    })

    it("should inherit the message from the cause", () => {
      const err1 = new Cause.UnknownException(new Error("my error"))
      expect(err1.message).toEqual("my error")
    })

    it("should accept an override message", () => {
      const err1 = new Cause.UnknownException(new Error("my error"), "my message")
      expect(err1.message).toEqual("my message")
    })
  })
})

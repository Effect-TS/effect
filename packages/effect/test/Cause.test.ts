import { Array as Arr, Cause, Effect, Either, Equal, FiberId, Hash, Option, Predicate } from "effect"
import * as fc from "effect/FastCheck"
import { NodeInspectSymbol } from "effect/Inspectable"
import * as internal from "effect/internal/cause"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "effect/test/util"
import { causes, equalCauses, errorCauseFunctions, errors } from "effect/test/utils/cause"
import { describe, expect, it } from "vitest"

describe("Cause", () => {
  const empty = Cause.empty
  const failure = Cause.fail("error")
  const defect = Cause.die("defect")
  const interruption = Cause.interrupt(FiberId.runtime(1, 0))
  const sequential = Cause.sequential(failure, defect)
  const parallel = Cause.parallel(failure, defect)

  describe("InterruptedException", () => {
    it("correctly implements toString() and the NodeInspectSymbol", () => {
      // Referenced line to be included in the string output
      const ex = new Cause.InterruptedException("my message")
      expect(ex.toString()).include("InterruptedException: my message")

      // In Node.js environments, ensure the 'inspect' method includes line information
      if (typeof window === "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { inspect } = require("node:util")
        expect(inspect(ex)).include("Cause.test.ts:20") // <= reference to the line above
      }
    })
  })

  describe("UnknownException", () => {
    it("exposes its `error` property", () => {
      const err1 = new Cause.UnknownException("my message")
      expect(err1.error).toBe("my message")
      const err2 = new Cause.UnknownException(new Error("my error"))
      expect(err2.error).toBeInstanceOf(Error)
      expect((err2.error as Error).message).toBe("my error")
    })

    it("exposes its `cause` property", () => {
      const err1 = new Cause.UnknownException("my message")
      expect(err1.cause).toBe("my message")
      const err2 = new Cause.UnknownException(new Error("my error"))
      expect(err2.cause).toBeInstanceOf(Error)
      expect((err2.cause as Error).message).toBe("my error")
    })

    it("uses a default message when none is provided", () => {
      const err1 = new Cause.UnknownException("my message")
      expect(err1.message).toBe("An unknown error occurred")
    })

    it("accepts a custom override message", () => {
      const err1 = new Cause.UnknownException(new Error("my error"), "my message")
      expect(err1.message).toBe("my message")
    })
  })

  it("[internal] prettyErrorMessage converts errors into readable JSON-like strings", () => {
    class Error1 {
      readonly _tag = "WithTag"
    }
    expect(internal.prettyErrorMessage(new Error1())).toBe(`{"_tag":"WithTag"}`)
    class Error2 {
      readonly _tag = "WithMessage"
      readonly message = "my message"
    }
    expect(internal.prettyErrorMessage(new Error2())).toBe(`{"_tag":"WithMessage","message":"my message"}`)
    class Error3 {
      readonly _tag = "WithName"
      readonly name = "my name"
    }
    expect(internal.prettyErrorMessage(new Error3())).toBe(
      `{"_tag":"WithName","name":"my name"}`
    )
    class Error4 {
      readonly _tag = "WithName"
      readonly name = "my name"
      readonly message = "my message"
    }
    expect(internal.prettyErrorMessage(new Error4())).toBe(
      `{"_tag":"WithName","name":"my name","message":"my message"}`
    )
    class Error5 {
      readonly _tag = "WithToString"
      toString() {
        return "Error: my string"
      }
    }
    expect(internal.prettyErrorMessage(new Error5())).toBe(
      `Error: my string`
    )
  })

  describe("Cause prototype", () => {
    describe("toJSON / [NodeInspectSymbol]", () => {
      const expectJSON = (cause: Cause.Cause<unknown>, expected: unknown) => {
        deepStrictEqual(cause.toJSON(), expected)
        deepStrictEqual(cause[NodeInspectSymbol](), expected)
      }

      it("Empty", () => {
        expectJSON(Cause.empty, {
          _id: "Cause",
          _tag: "Empty"
        })
      })

      it("Fail", () => {
        expectJSON(Cause.fail(Option.some(1)), {
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
        expectJSON(Cause.die(Option.some(1)), {
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
        expectJSON(Cause.interrupt(FiberId.none), {
          _id: "Cause",
          _tag: "Interrupt",
          fiberId: {
            _id: "FiberId",
            _tag: "None"
          }
        })
        expectJSON(Cause.interrupt(FiberId.runtime(1, 0)), {
          _id: "Cause",
          _tag: "Interrupt",
          fiberId: {
            _id: "FiberId",
            _tag: "Runtime",
            id: 1,
            startTimeMillis: 0
          }
        })
        expectJSON(Cause.interrupt(FiberId.composite(FiberId.none, FiberId.runtime(1, 0))), {
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
        expectJSON(Cause.sequential(Cause.fail("failure 1"), Cause.fail("failure 2")), {
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
        expectJSON(Cause.parallel(Cause.fail("failure 1"), Cause.fail("failure 2")), {
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
        expect(String(Cause.empty)).toBe(`All fibers interrupted without errors.`)
      })

      it("Fail", () => {
        expect(String(Cause.fail("my failure"))).toBe(`Error: my failure`)
        expect(String(Cause.fail(new Error("my failure")))).includes(`Error: my failure`)
      })

      it("Die", () => {
        expect(String(Cause.die("die message"))).toBe(`Error: die message`)
        expect(String(Cause.die(new Error("die message")))).includes(`Error: die message`)
      })

      it("Interrupt", () => {
        expect(String(Cause.interrupt(FiberId.none))).toBe(`All fibers interrupted without errors.`)
        expect(String(Cause.interrupt(FiberId.runtime(1, 0)))).toBe(`All fibers interrupted without errors.`)
        expect(String(Cause.interrupt(FiberId.composite(FiberId.none, FiberId.runtime(1, 0))))).toBe(
          `All fibers interrupted without errors.`
        )
      })

      it("Sequential", () => {
        expect(String(Cause.sequential(Cause.fail("failure 1"), Cause.fail("failure 2")))).toBe(
          `Error: failure 1\nError: failure 2`
        )
        const actual = String(Cause.sequential(Cause.fail(new Error("failure 1")), Cause.fail(new Error("failure 2"))))
        expect(actual).includes("Error: failure 1")
        expect(actual).includes("Error: failure 2")
      })

      it("Parallel", () => {
        expect(String(Cause.parallel(Cause.fail("failure 1"), Cause.fail("failure 2")))).toBe(
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
      it("compares causes by value", () => {
        assertTrue(Equal.equals(Cause.fail(0), Cause.fail(0)))
        assertTrue(Equal.equals(Cause.die(0), Cause.die(0)))
        assertFalse(Equal.equals(Cause.fail(0), Cause.fail(1)))
        assertFalse(Equal.equals(Cause.die(0), Cause.die(1)))
      })

      it("is symmetric", () => {
        fc.assert(fc.property(causes, causes, (causeA, causeB) => {
          strictEqual(
            Equal.equals(causeA, causeB),
            Equal.equals(causeB, causeA)
          )
        }))
      })

      it("generates identical hashes for equal causes", () => {
        fc.assert(fc.property(equalCauses, ([causeA, causeB]) => {
          strictEqual(Hash.hash(causeA), Hash.hash(causeB))
        }))
      })

      it("distinguishes different failure types", () => {
        expect(Equal.equals(Cause.die(0), Cause.fail(0))).toBe(false)
        expect(
          Equal.equals(
            Cause.parallel(Cause.fail("fail1"), Cause.die("fail2")),
            Cause.parallel(Cause.fail("fail2"), Cause.die("fail1"))
          )
        ).toBe(false)
        expect(
          Equal.equals(
            Cause.sequential(Cause.fail("fail1"), Cause.die("fail2")),
            Cause.parallel(Cause.fail("fail1"), Cause.die("fail2"))
          )
        ).toBe(false)
      })
    })
  })

  describe("Guards", () => {
    it("isCause", () => {
      expect(Cause.isCause(empty)).toBe(true)
      expect(Cause.isCause(failure)).toBe(true)
      expect(Cause.isCause(defect)).toBe(true)
      expect(Cause.isCause(interruption)).toBe(true)
      expect(Cause.isCause(sequential)).toBe(true)
      expect(Cause.isCause(parallel)).toBe(true)

      expect(Cause.isCause({})).toBe(false)
    })

    it("isEmptyType", () => {
      expect(Cause.isEmptyType(empty)).toBe(true)
      expect(Cause.isEmptyType(failure)).toBe(false)
      expect(Cause.isEmptyType(defect)).toBe(false)
      expect(Cause.isEmptyType(interruption)).toBe(false)
      expect(Cause.isEmptyType(sequential)).toBe(false)
      expect(Cause.isEmptyType(parallel)).toBe(false)
    })

    it("isFailType", () => {
      expect(Cause.isFailType(empty)).toBe(false)
      expect(Cause.isFailType(failure)).toBe(true)
      expect(Cause.isFailType(defect)).toBe(false)
      expect(Cause.isFailType(interruption)).toBe(false)
      expect(Cause.isFailType(sequential)).toBe(false)
      expect(Cause.isFailType(parallel)).toBe(false)
    })

    it("isDieType", () => {
      expect(Cause.isDieType(empty)).toBe(false)
      expect(Cause.isDieType(failure)).toBe(false)
      expect(Cause.isDieType(defect)).toBe(true)
      expect(Cause.isDieType(interruption)).toBe(false)
      expect(Cause.isDieType(sequential)).toBe(false)
      expect(Cause.isDieType(parallel)).toBe(false)
    })

    it("isInterruptType", () => {
      expect(Cause.isInterruptType(empty)).toBe(false)
      expect(Cause.isInterruptType(failure)).toBe(false)
      expect(Cause.isInterruptType(defect)).toBe(false)
      expect(Cause.isInterruptType(interruption)).toBe(true)
      expect(Cause.isInterruptType(sequential)).toBe(false)
      expect(Cause.isInterruptType(parallel)).toBe(false)
    })

    it("isSequentialType", () => {
      expect(Cause.isSequentialType(empty)).toBe(false)
      expect(Cause.isSequentialType(failure)).toBe(false)
      expect(Cause.isSequentialType(defect)).toBe(false)
      expect(Cause.isSequentialType(interruption)).toBe(false)
      expect(Cause.isSequentialType(sequential)).toBe(true)
      expect(Cause.isSequentialType(parallel)).toBe(false)
    })

    it("isParallelType", () => {
      expect(Cause.isParallelType(empty)).toBe(false)
      expect(Cause.isParallelType(failure)).toBe(false)
      expect(Cause.isParallelType(defect)).toBe(false)
      expect(Cause.isParallelType(interruption)).toBe(false)
      expect(Cause.isParallelType(sequential)).toBe(false)
      expect(Cause.isParallelType(parallel)).toBe(true)
    })
  })

  describe("Getters", () => {
    it("isEmpty", () => {
      expect(Cause.isEmpty(empty)).toBe(true)
      expect(Cause.isEmpty(Cause.sequential(empty, empty))).toBe(true)
      expect(Cause.isEmpty(Cause.parallel(empty, empty))).toBe(true)
      expect(Cause.isEmpty(Cause.parallel(empty, Cause.sequential(empty, empty)))).toBe(true)
      expect(Cause.isEmpty(Cause.sequential(empty, Cause.parallel(empty, empty)))).toBe(true)

      expect(Cause.isEmpty(defect)).toBe(false)
      expect(Cause.isEmpty(Cause.sequential(empty, failure))).toBe(false)
      expect(Cause.isEmpty(Cause.parallel(empty, failure))).toBe(false)
      expect(Cause.isEmpty(Cause.parallel(empty, Cause.sequential(empty, failure)))).toBe(false)
      expect(Cause.isEmpty(Cause.sequential(empty, Cause.parallel(empty, failure)))).toBe(false)
    })

    it("isFailure", () => {
      expect(Cause.isFailure(failure)).toBe(true)
      expect(Cause.isFailure(Cause.sequential(empty, failure))).toBe(true)
      expect(Cause.isFailure(Cause.parallel(empty, failure))).toBe(true)
      expect(Cause.isFailure(Cause.parallel(empty, Cause.sequential(empty, failure)))).toBe(true)
      expect(Cause.isFailure(Cause.sequential(empty, Cause.parallel(empty, failure)))).toBe(true)

      expect(Cause.isFailure(Cause.sequential(empty, Cause.parallel(empty, empty)))).toBe(false)
    })

    it("isDie", () => {
      expect(Cause.isDie(defect)).toBe(true)
      expect(Cause.isDie(Cause.sequential(empty, defect))).toBe(true)
      expect(Cause.isDie(Cause.parallel(empty, defect))).toBe(true)
      expect(Cause.isDie(Cause.parallel(empty, Cause.sequential(empty, defect)))).toBe(true)
      expect(Cause.isDie(Cause.sequential(empty, Cause.parallel(empty, defect)))).toBe(true)

      expect(Cause.isDie(Cause.sequential(empty, Cause.parallel(empty, empty)))).toBe(false)
    })

    it("isInterrupted", () => {
      expect(Cause.isInterrupted(interruption)).toBe(true)
      expect(Cause.isInterrupted(Cause.sequential(empty, interruption))).toBe(true)
      expect(Cause.isInterrupted(Cause.parallel(empty, interruption))).toBe(true)
      expect(Cause.isInterrupted(Cause.parallel(empty, Cause.sequential(empty, interruption)))).toBe(true)
      expect(Cause.isInterrupted(Cause.sequential(empty, Cause.parallel(empty, interruption)))).toBe(true)

      expect(Cause.isInterrupted(Cause.sequential(failure, interruption))).toBe(true)
      expect(Cause.isInterrupted(Cause.parallel(failure, interruption))).toBe(true)
      expect(Cause.isInterrupted(Cause.parallel(failure, Cause.sequential(empty, interruption)))).toBe(true)
      expect(Cause.isInterrupted(Cause.sequential(failure, Cause.parallel(empty, interruption)))).toBe(true)

      expect(Cause.isInterrupted(Cause.sequential(empty, Cause.parallel(empty, empty)))).toBe(false)
    })

    it("isInterruptedOnly", () => {
      expect(Cause.isInterruptedOnly(interruption)).toBe(true)
      expect(Cause.isInterruptedOnly(Cause.sequential(empty, interruption))).toBe(true)
      expect(Cause.isInterruptedOnly(Cause.parallel(empty, interruption))).toBe(true)
      expect(Cause.isInterruptedOnly(Cause.parallel(empty, Cause.sequential(empty, interruption)))).toBe(true)
      expect(Cause.isInterruptedOnly(Cause.sequential(empty, Cause.parallel(empty, interruption)))).toBe(true)
      // Cause.empty is considered a valid candidate
      expect(Cause.isInterruptedOnly(Cause.sequential(empty, Cause.parallel(empty, empty)))).toBe(true)

      expect(Cause.isInterruptedOnly(Cause.sequential(failure, interruption))).toBe(false)
      expect(Cause.isInterruptedOnly(Cause.parallel(failure, interruption))).toBe(false)
      expect(Cause.isInterruptedOnly(Cause.parallel(failure, Cause.sequential(empty, interruption)))).toBe(false)
      expect(Cause.isInterruptedOnly(Cause.sequential(failure, Cause.parallel(empty, interruption)))).toBe(false)
    })

    describe("failures", () => {
      it("should return a Chunk of all recoverable errors", () => {
        const expectFailures = <E>(cause: Cause.Cause<E>, expected: Array<E>) => {
          deepStrictEqual([...Cause.failures(cause)], expected)
        }
        expectFailures(empty, [])
        expectFailures(failure, ["error"])
        expectFailures(Cause.parallel(Cause.fail("error1"), Cause.fail("error2")), ["error1", "error2"])
        expectFailures(Cause.sequential(Cause.fail("error1"), Cause.fail("error2")), ["error1", "error2"])
        expectFailures(Cause.parallel(failure, defect), ["error"])
        expectFailures(Cause.sequential(failure, defect), ["error"])
        expectFailures(Cause.sequential(interruption, Cause.parallel(empty, failure)), ["error"])
      })

      it("fails safely for large parallel cause constructions", () => {
        const n = 10_000
        const cause = Array.from({ length: n - 1 }, () => Cause.fail("fail")).reduce(Cause.parallel, Cause.fail("fail"))
        const result = Cause.failures(cause)
        strictEqual(Array.from(result).length, n)
      })
    })

    it("defects", () => {
      const expectDefects = <E>(cause: Cause.Cause<E>, expected: Array<unknown>) => {
        deepStrictEqual([...Cause.defects(cause)], expected)
      }
      expectDefects(empty, [])
      expectDefects(defect, ["defect"])
      expectDefects(Cause.parallel(Cause.die("defect1"), Cause.die("defect2")), ["defect1", "defect2"])
      expectDefects(Cause.sequential(Cause.die("defect1"), Cause.die("defect2")), ["defect1", "defect2"])
      expectDefects(Cause.parallel(failure, defect), ["defect"])
      expectDefects(Cause.sequential(failure, defect), ["defect"])
      expectDefects(Cause.sequential(interruption, Cause.parallel(empty, defect)), ["defect"])
    })

    it("interruptors", () => {
      const expectInterruptors = <E>(cause: Cause.Cause<E>, expected: Array<FiberId.FiberId>) => {
        deepStrictEqual([...Cause.interruptors(cause)], expected)
      }
      expectInterruptors(empty, [])
      expectInterruptors(interruption, [FiberId.runtime(1, 0)])
      expectInterruptors(
        Cause.sequential(
          Cause.interrupt(FiberId.runtime(1, 0)),
          Cause.parallel(empty, Cause.interrupt(FiberId.runtime(2, 0)))
        ),
        [FiberId.runtime(2, 0), FiberId.runtime(1, 0)]
      )
    })

    it("size", () => {
      expect(Cause.size(empty)).toBe(0)
      expect(Cause.size(failure)).toBe(1)
      expect(Cause.size(defect)).toBe(1)
      expect(Cause.size(Cause.parallel(Cause.fail("error1"), Cause.fail("error2")))).toBe(2)
      expect(Cause.size(Cause.sequential(Cause.fail("error1"), Cause.fail("error2")))).toBe(2)
      expect(Cause.size(Cause.parallel(failure, defect))).toBe(2)
      expect(Cause.size(Cause.sequential(failure, defect))).toBe(2)
      expect(Cause.size(Cause.sequential(interruption, Cause.parallel(empty, failure)))).toBe(2)
      expect(Cause.size(Cause.sequential(interruption, Cause.parallel(defect, failure)))).toBe(3)
    })

    it("failureOption", () => {
      const expectFailureOption = <E>(cause: Cause.Cause<E>, expected: Option.Option<E>) => {
        deepStrictEqual(Cause.failureOption(cause), expected)
      }
      expectFailureOption(empty, Option.none())
      expectFailureOption(failure, Option.some("error"))
      expectFailureOption(Cause.sequential(Cause.fail("error1"), Cause.fail("error2")), Option.some("error1"))
      expectFailureOption(Cause.parallel(Cause.fail("error1"), Cause.fail("error2")), Option.some("error1"))
      expectFailureOption(Cause.parallel(failure, defect), Option.some("error"))
      expectFailureOption(Cause.sequential(failure, defect), Option.some("error"))
      expectFailureOption(Cause.sequential(interruption, Cause.parallel(empty, failure)), Option.some("error"))
    })

    it("failureOrCause", () => {
      const expectLeft = <E>(cause: Cause.Cause<E>, expected: E) => {
        deepStrictEqual(Cause.failureOrCause(cause), Either.left(expected))
      }
      const expectRight = (cause: Cause.Cause<never>) => {
        deepStrictEqual(Cause.failureOrCause(cause), Either.right(cause))
      }

      expectLeft(failure, "error")
      expectLeft(Cause.parallel(Cause.fail("error1"), Cause.fail("error2")), "error1")
      expectLeft(Cause.sequential(Cause.fail("error1"), Cause.fail("error2")), "error1")
      expectLeft(Cause.sequential(interruption, Cause.parallel(empty, failure)), "error")

      expectRight(empty)
      expectRight(defect)
      expectRight(interruption)
      expectRight(Cause.sequential(interruption, Cause.parallel(empty, defect)))
    })

    it("flipCauseOption", () => {
      deepStrictEqual(Cause.flipCauseOption(empty), Option.some(empty))
      deepStrictEqual(Cause.flipCauseOption(defect), Option.some(defect))
      deepStrictEqual(Cause.flipCauseOption(interruption), Option.some(interruption))
      deepStrictEqual(Cause.flipCauseOption(Cause.fail(Option.none())), Option.none())
      deepStrictEqual(Cause.flipCauseOption(Cause.fail(Option.some("error"))), Option.some(Cause.fail("error")))
      // sequential
      deepStrictEqual(
        Cause.flipCauseOption(Cause.sequential(Cause.fail(Option.some("error1")), Cause.fail(Option.some("error2")))),
        Option.some(Cause.sequential(Cause.fail("error1"), Cause.fail("error2")))
      )
      deepStrictEqual(
        Cause.flipCauseOption(Cause.sequential(Cause.fail(Option.some("error1")), Cause.fail(Option.none()))),
        Option.some(Cause.fail("error1"))
      )
      deepStrictEqual(
        Cause.flipCauseOption(Cause.sequential(Cause.fail(Option.none()), Cause.fail(Option.some("error2")))),
        Option.some(Cause.fail("error2"))
      )
      deepStrictEqual(
        Cause.flipCauseOption(Cause.sequential(Cause.fail(Option.none()), Cause.fail(Option.none()))),
        Option.none()
      )
      // parallel
      deepStrictEqual(
        Cause.flipCauseOption(Cause.parallel(Cause.fail(Option.some("error1")), Cause.fail(Option.some("error2")))),
        Option.some(Cause.parallel(Cause.fail("error1"), Cause.fail("error2")))
      )
      deepStrictEqual(
        Cause.flipCauseOption(Cause.parallel(Cause.fail(Option.some("error1")), Cause.fail(Option.none()))),
        Option.some(Cause.fail("error1"))
      )
      deepStrictEqual(
        Cause.flipCauseOption(Cause.parallel(Cause.fail(Option.none()), Cause.fail(Option.some("error2")))),
        Option.some(Cause.fail("error2"))
      )
      deepStrictEqual(
        Cause.flipCauseOption(Cause.parallel(Cause.fail(Option.none()), Cause.fail(Option.none()))),
        Option.none()
      )
    })

    it("dieOption", () => {
      const expectDieOption = <E>(cause: Cause.Cause<E>, expected: Option.Option<unknown>) => {
        deepStrictEqual(Cause.dieOption(cause), expected)
      }
      expectDieOption(empty, Option.none())
      expectDieOption(defect, Option.some("defect"))
      expectDieOption(Cause.parallel(Cause.die("defect1"), Cause.die("defect2")), Option.some("defect1"))
      expectDieOption(Cause.sequential(Cause.die("defect1"), Cause.die("defect2")), Option.some("defect1"))
      expectDieOption(Cause.parallel(failure, defect), Option.some("defect"))
      expectDieOption(Cause.sequential(failure, defect), Option.some("defect"))
      expectDieOption(Cause.sequential(interruption, Cause.parallel(empty, defect)), Option.some("defect"))
    })

    it("interruptOption", () => {
      const expectInterruptOption = <E>(cause: Cause.Cause<E>, expected: Option.Option<FiberId.FiberId>) => {
        deepStrictEqual(Cause.interruptOption(cause), expected)
      }
      expectInterruptOption(empty, Option.none())
      expectInterruptOption(interruption, Option.some(FiberId.runtime(1, 0)))
      expectInterruptOption(
        Cause.sequential(
          Cause.interrupt(FiberId.runtime(1, 0)),
          Cause.parallel(empty, Cause.interrupt(FiberId.runtime(2, 0)))
        ),
        Option.some(FiberId.runtime(1, 0))
      )
    })

    it("keepDefects", () => {
      deepStrictEqual(Cause.keepDefects(empty), Option.none())
      deepStrictEqual(Cause.keepDefects(failure), Option.none())
      deepStrictEqual(Cause.keepDefects(defect), Option.some(defect))
      deepStrictEqual(
        Cause.keepDefects(Cause.sequential(Cause.die("defect1"), Cause.die("defect2"))),
        Option.some(Cause.sequential(Cause.die("defect1"), Cause.die("defect2")))
      )
      deepStrictEqual(Cause.keepDefects(Cause.sequential(empty, empty)), Option.none())
      deepStrictEqual(Cause.keepDefects(Cause.sequential(defect, failure)), Option.some(defect))
      deepStrictEqual(Cause.keepDefects(Cause.parallel(empty, empty)), Option.none())
      deepStrictEqual(Cause.keepDefects(Cause.parallel(defect, failure)), Option.some(defect))
      deepStrictEqual(
        Cause.keepDefects(Cause.parallel(Cause.die("defect1"), Cause.die("defect2"))),
        Option.some(Cause.parallel(Cause.die("defect1"), Cause.die("defect2")))
      )
      deepStrictEqual(
        Cause.keepDefects(
          Cause.sequential(failure, Cause.parallel(Cause.die("defect1"), Cause.die("defect2")))
        ),
        Option.some(Cause.parallel(Cause.die("defect1"), Cause.die("defect2")))
      )
      deepStrictEqual(
        Cause.keepDefects(
          Cause.sequential(Cause.die("defect1"), Cause.parallel(failure, Cause.die("defect2")))
        ),
        Option.some(Cause.sequential(Cause.die("defect1"), Cause.die("defect2")))
      )
    })

    it("ensures isDie and keepDefects are consistent", () => {
      fc.assert(fc.property(causes, (cause) => {
        const result = Cause.keepDefects(cause)
        if (Cause.isDie(cause)) {
          return Option.isSome(result)
        } else {
          return Option.isNone(result)
        }
      }))
    })

    // TODO: what's the point of this API?
    it("linearize", () => {
      const expectLinearize = <E>(cause: Cause.Cause<E>, expected: Array<Cause.Cause<E>>) => {
        deepStrictEqual([...Cause.linearize(cause)], expected)
      }
      expectLinearize(empty, [])
      expectLinearize(failure, [failure])
      expectLinearize(defect, [defect])
      expectLinearize(interruption, [interruption])
      expectLinearize(Cause.sequential(failure, defect), [Cause.sequential(failure, defect)])
      expectLinearize(Cause.parallel(failure, defect), [Cause.parallel(failure, defect)])
      expectLinearize(Cause.sequential(failure, Cause.sequential(interruption, defect)), [
        Cause.sequential(failure, Cause.sequential(interruption, defect))
      ])
      expectLinearize(Cause.parallel(failure, Cause.parallel(interruption, defect)), [
        Cause.parallel(failure, Cause.parallel(interruption, defect))
      ])
      expectLinearize(
        Cause.sequential(
          Cause.sequential(Cause.fail("error1"), Cause.fail("error2")),
          Cause.sequential(Cause.fail("error3"), Cause.fail("error4"))
        ),
        [
          Cause.sequential(
            Cause.sequential(Cause.fail("error1"), Cause.fail("error2")),
            Cause.sequential(Cause.fail("error3"), Cause.fail("error4"))
          )
        ]
      )
      expectLinearize(
        Cause.parallel(
          Cause.parallel(Cause.fail("error1"), Cause.fail("error2")),
          Cause.parallel(Cause.fail("error3"), Cause.fail("error4"))
        ),
        [
          Cause.parallel(
            Cause.parallel(Cause.fail("error1"), Cause.fail("error2")),
            Cause.parallel(Cause.fail("error3"), Cause.fail("error4"))
          )
        ]
      )
    })

    it("stripFailures", () => {
      const expectStripFailures = <E>(cause: Cause.Cause<E>, expected: Cause.Cause<never>) => {
        deepStrictEqual(Cause.stripFailures(cause), expected)
      }
      expectStripFailures(empty, empty)
      expectStripFailures(failure, empty)
      expectStripFailures(defect, defect)
      expectStripFailures(interruption, interruption)
      expectStripFailures(interruption, interruption)
      expectStripFailures(Cause.sequential(failure, defect), Cause.sequential(empty, defect))
      expectStripFailures(Cause.parallel(failure, defect), Cause.parallel(empty, defect))
    })

    it("stripSomeDefects", () => {
      const cause1 = Cause.die({
        _tag: "NumberFormatException",
        msg: "can't parse to int"
      })
      const cause2 = Cause.die({
        _tag: "ArithmeticException",
        msg: "division by zero"
      })
      const stripNumberFormatException = Cause.stripSomeDefects((defect) =>
        Predicate.isTagged(defect, "NumberFormatException")
          ? Option.some(defect) :
          Option.none()
      )
      deepStrictEqual(stripNumberFormatException(empty), Option.some(empty))
      deepStrictEqual(stripNumberFormatException(failure), Option.some(failure))
      deepStrictEqual(stripNumberFormatException(interruption), Option.some(interruption))
      deepStrictEqual(stripNumberFormatException(cause1), Option.none())
      deepStrictEqual(stripNumberFormatException(Cause.sequential(cause1, cause1)), Option.none())
      deepStrictEqual(stripNumberFormatException(Cause.sequential(cause1, cause2)), Option.some(cause2))
      deepStrictEqual(stripNumberFormatException(Cause.sequential(cause2, cause1)), Option.some(cause2))
      deepStrictEqual(
        stripNumberFormatException(Cause.sequential(cause2, cause2)),
        Option.some(Cause.sequential(cause2, cause2))
      )
      deepStrictEqual(stripNumberFormatException(Cause.parallel(cause1, cause1)), Option.none())
      deepStrictEqual(stripNumberFormatException(Cause.parallel(cause1, cause2)), Option.some(cause2))
      deepStrictEqual(stripNumberFormatException(Cause.parallel(cause2, cause1)), Option.some(cause2))
      deepStrictEqual(
        stripNumberFormatException(Cause.parallel(cause2, cause2)),
        Option.some(Cause.parallel(cause2, cause2))
      )
    })
  })

  describe("Mapping", () => {
    it("as", () => {
      const expectAs = <E>(cause: Cause.Cause<E>, expected: Cause.Cause<number>) => {
        deepStrictEqual(Cause.as(cause, 2), expected)
      }
      expectAs(empty, empty)
      expectAs(failure, Cause.fail(2))
      expectAs(defect, defect)
      expectAs(interruption, interruption)
      expectAs(sequential, Cause.sequential(Cause.fail(2), defect))
      expectAs(parallel, Cause.parallel(Cause.fail(2), defect))
    })

    it("map", () => {
      const expectMap = <E>(cause: Cause.Cause<E>, expected: Cause.Cause<number>) => {
        deepStrictEqual(Cause.map(cause, () => 2), expected)
      }
      expectMap(empty, empty)
      expectMap(failure, Cause.fail(2))
      expectMap(defect, defect)
      expectMap(interruption, interruption)
      expectMap(sequential, Cause.sequential(Cause.fail(2), defect))
      expectMap(parallel, Cause.parallel(Cause.fail(2), defect))
    })
  })

  describe("Sequencing", () => {
    describe("flatMap", () => {
      it("obeys left identity", () => {
        fc.assert(fc.property(causes, (cause) => {
          const left = cause.pipe(Cause.flatMap(Cause.fail))
          const right = cause
          assertTrue(Equal.equals(left, right))
        }))
      })

      it("obeys right identity", () => {
        fc.assert(fc.property(errors, errorCauseFunctions, (error, f) => {
          const left = Cause.fail(error).pipe(Cause.flatMap(f))
          const right = f(error)
          assertTrue(Equal.equals(left, right))
        }))
      })

      it("is associative", () => {
        fc.assert(fc.property(causes, errorCauseFunctions, errorCauseFunctions, (cause, f, g) => {
          const left = cause.pipe(Cause.flatMap(f), Cause.flatMap(g))
          const right = cause.pipe(Cause.flatMap((error) => f(error).pipe(Cause.flatMap(g))))
          assertTrue(Equal.equals(left, right))
        }))
      })
    })

    it("andThen returns the second cause if the first one is failing", () => {
      const err1 = Cause.fail("err1")
      const err2 = Cause.fail("err2")
      deepStrictEqual(err1.pipe(Cause.andThen(() => err2)), err2)
      deepStrictEqual(err1.pipe(Cause.andThen(err2)), err2)
      deepStrictEqual(Cause.andThen(err1, () => err2), err2)
      deepStrictEqual(Cause.andThen(err1, err2), err2)
    })

    it("flatten", () => {
      const expectFlatten = <E>(cause: Cause.Cause<Cause.Cause<E>>, expected: Cause.Cause<E>) => {
        deepStrictEqual(Cause.flatten(cause), expected)
      }
      expectFlatten(Cause.fail(empty), empty)
      expectFlatten(Cause.fail(failure), failure)
      expectFlatten(Cause.fail(defect), defect)
      expectFlatten(Cause.fail(interruption), interruption)
      expectFlatten(Cause.fail(sequential), sequential)
      expectFlatten(Cause.fail(parallel), parallel)
    })
  })

  describe("Elements", () => {
    it("contains", () => {
      const expectContains = <E, E2>(cause: Cause.Cause<E>, expected: Cause.Cause<E2>) => {
        assertTrue(Cause.contains(cause, expected))
      }

      expectContains(empty, empty)
      expectContains(failure, failure)
      expectContains(defect, defect)
      expectContains(interruption, interruption)
      expectContains(sequential, sequential)
      expectContains(parallel, parallel)
      expectContains(sequential, failure)
      expectContains(sequential, defect)
      expectContains(parallel, failure)
      expectContains(parallel, defect)
    })

    it("find", () => {
      const expectFind = <E>(cause: Cause.Cause<E>, expected: Option.Option<string>) => {
        deepStrictEqual(
          Cause.find(
            cause,
            (cause) =>
              Cause.isFailType(cause) && Predicate.isString(cause.error) ? Option.some(cause.error) : Option.none()
          ),
          expected
        )
      }

      expectFind(empty, Option.none())
      expectFind(failure, Option.some("error"))
      expectFind(defect, Option.none())
      expectFind(interruption, Option.none())
      expectFind(sequential, Option.some("error"))
      expectFind(parallel, Option.some("error"))
    })
  })

  describe("Destructors", () => {
    it("squash", () => {
      const expectSquash = <E>(cause: Cause.Cause<E>, expected: unknown) => {
        deepStrictEqual(Cause.squash(cause), expected)
      }

      expectSquash(empty, new Cause.InterruptedException("Interrupted by fibers: "))
      expectSquash(failure, "error")
      expectSquash(defect, "defect")
      expectSquash(interruption, new Cause.InterruptedException("Interrupted by fibers: #1"))
      expectSquash(sequential, "error")
      expectSquash(parallel, "error")
      expectSquash(Cause.sequential(empty, defect), "defect")
      expectSquash(Cause.parallel(empty, defect), "defect")
    })

    it.todo("squashWith", () => {
    })
  })

  describe("Filtering", () => {
    it("filter", () => {
      const expectFilter = <E>(cause: Cause.Cause<E>, expected: Cause.Cause<E>) => {
        deepStrictEqual(
          Cause.filter(
            cause,
            (cause) => Cause.isFailType(cause) && Predicate.isString(cause.error) && cause.error === "error"
          ),
          expected
        )
      }

      expectFilter(empty, empty)
      expectFilter(failure, failure)
      expectFilter(defect, defect)
      expectFilter(interruption, interruption)
      expectFilter(sequential, failure)
      expectFilter(Cause.sequential(failure, failure), Cause.sequential(failure, failure))
      expectFilter(Cause.sequential(defect, failure), failure)
      expectFilter(Cause.sequential(defect, defect), empty)
      expectFilter(parallel, failure)
      expectFilter(Cause.parallel(failure, failure), Cause.parallel(failure, failure))
      expectFilter(Cause.parallel(defect, failure), failure)
      expectFilter(Cause.parallel(defect, defect), empty)
    })
  })

  describe("Matching", () => {
    it("match", () => {
      const expectMatch = <E>(cause: Cause.Cause<E>, expected: string) => {
        strictEqual(
          Cause.match(cause, {
            onEmpty: "Empty",
            onFail: () => "Fail",
            onDie: () => "Die",
            onInterrupt: () => "Interrupt",
            onSequential: () => "Sequential",
            onParallel: () => "Parallel"
          }),
          expected
        )
      }
      expectMatch(empty, "Empty")
      expectMatch(failure, "Fail")
      expectMatch(defect, "Die")
      expectMatch(interruption, "Interrupt")
      expectMatch(sequential, "Sequential")
      expectMatch(parallel, "Parallel")
    })
  })

  describe("Reducing", () => {
    it.todo("reduce", () => {
    })

    it.todo("reduceWithContext", () => {
    })
  })

  describe("Formatting", () => {
    it("prettyErrors", () => {
      deepStrictEqual(Cause.prettyErrors(empty), [])
      deepStrictEqual(Cause.prettyErrors(failure), [new internal.PrettyError("error")])
      deepStrictEqual(Cause.prettyErrors(defect), [new internal.PrettyError("defect")])
      deepStrictEqual(Cause.prettyErrors(interruption), [])
      deepStrictEqual(Cause.prettyErrors(sequential), [
        new internal.PrettyError("error"),
        new internal.PrettyError("defect")
      ])
      deepStrictEqual(Cause.prettyErrors(parallel), [
        new internal.PrettyError("error"),
        new internal.PrettyError("defect")
      ])
    })

    describe("pretty", () => {
      const simplifyStackTrace = (s: string): Array<string> => {
        return Arr.filterMap(s.split("\n"), (s) => {
          const t = s.trimStart()
          if (t === "}") {
            return Option.none()
          }
          if (t.startsWith("at [")) {
            return Option.some(t.substring(0, t.indexOf("] ") + 1))
          }
          if (t.startsWith("at ")) {
            return Option.none()
          }
          return Option.some(t)
        })
      }

      describe("renderErrorCause: false", () => {
        const expectPretty = <E>(cause: Cause.Cause<E>, expected: string | undefined) => {
          deepStrictEqual(Cause.pretty(cause), expected)
          deepStrictEqual(Cause.pretty(cause, { renderErrorCause: false }), expected)
        }

        it("handles array-based errors without throwing", () => {
          expectPretty(Cause.fail([{ toString: "" }]), `Error: [{"toString":""}]`)
        })

        it("Empty", () => {
          expectPretty(empty, "All fibers interrupted without errors.")
        })

        it("Fail", () => {
          class Error1 {
            readonly _tag = "WithTag"
          }
          expectPretty(Cause.fail(new Error1()), `Error: {"_tag":"WithTag"}`)
          class Error2 {
            readonly _tag = "WithMessage"
            readonly message = "my message"
          }
          expectPretty(Cause.fail(new Error2()), `Error: {"_tag":"WithMessage","message":"my message"}`)
          class Error3 {
            readonly _tag = "WithName"
            readonly name = "my name"
          }
          expectPretty(Cause.fail(new Error3()), `Error: {"_tag":"WithName","name":"my name"}`)
          class Error4 {
            readonly _tag = "WithName"
            readonly name = "my name"
            readonly message = "my message"
          }
          expectPretty(Cause.fail(new Error4()), `Error: {"_tag":"WithName","name":"my name","message":"my message"}`)
          class Error5 {
            readonly _tag = "WithToString"
            toString() {
              return "my string"
            }
          }
          expectPretty(Cause.fail(new Error5()), `Error: my string`)

          const err1 = new Error("message", { cause: "my cause" })
          expectPretty(Cause.fail(err1), err1.stack)
        })

        it("Interrupt", () => {
          expect(Cause.pretty(Cause.interrupt(FiberId.none))).toBe("All fibers interrupted without errors.")
          expect(Cause.pretty(Cause.interrupt(FiberId.runtime(1, 0)))).toBe(
            "All fibers interrupted without errors."
          )
          expect(Cause.pretty(Cause.interrupt(FiberId.composite(FiberId.none, FiberId.runtime(1, 0))))).toBe(
            "All fibers interrupted without errors."
          )
        })

        describe("Die", () => {
          it("with span", () => {
            const exit: any = Effect.die(new Error("my message")).pipe(
              Effect.withSpan("[myspan]"),
              Effect.exit,
              Effect.runSync
            )
            const cause = exit.cause
            const pretty = Cause.pretty(cause)
            deepStrictEqual(simplifyStackTrace(pretty), [`Error: my message`, "at [myspan]"])
          })
        })
      })

      describe("renderErrorCause: true", () => {
        describe("Fail", () => {
          it("no cause", () => {
            const pretty = Cause.pretty(Cause.fail(new Error("my message")), { renderErrorCause: true })
            deepStrictEqual(simplifyStackTrace(pretty), ["Error: my message"])
          })

          it("string cause", () => {
            const pretty = Cause.pretty(Cause.fail(new Error("my message", { cause: "my cause" })), {
              renderErrorCause: true
            })
            deepStrictEqual(simplifyStackTrace(pretty), ["Error: my message", "[cause]: Error: my cause"])
          })

          it("error cause", () => {
            const pretty = Cause.pretty(Cause.fail(new Error("my message", { cause: new Error("my cause") })), {
              renderErrorCause: true
            })
            deepStrictEqual(simplifyStackTrace(pretty), ["Error: my message", "[cause]: Error: my cause"])
          })

          it("error cause with nested cause", () => {
            const pretty = Cause.pretty(
              Cause.fail(new Error("my message", { cause: new Error("my cause", { cause: "nested cause" }) })),
              {
                renderErrorCause: true
              }
            )
            deepStrictEqual(simplifyStackTrace(pretty), [
              "Error: my message",
              "[cause]: Error: my cause",
              "[cause]: Error: nested cause"
            ])
          })
        })

        describe("Die", () => {
          it("with span", () => {
            const exit: any = Effect.die(new Error("my message", { cause: "my cause" })).pipe(
              Effect.withSpan("[myspan]"),
              Effect.exit,
              Effect.runSync
            )
            const cause = exit.cause
            const pretty = Cause.pretty(cause, { renderErrorCause: true })
            deepStrictEqual(simplifyStackTrace(pretty), [
              `Error: my message`,
              "at [myspan]",
              "[cause]: Error: my cause"
            ])
          })
        })
      })
    })
  })
})

import { describe, it } from "@effect/vitest"
import {
  assertFalse,
  assertInclude,
  assertLeft,
  assertNone,
  assertRight,
  assertSome,
  assertTrue,
  deepStrictEqual,
  strictEqual
} from "@effect/vitest/utils"
import {
  Array as Arr,
  Cause,
  Effect,
  Equal,
  FastCheck as fc,
  FiberId,
  Hash,
  Inspectable,
  Option,
  Predicate
} from "effect"
import * as internal from "../src/internal/cause.js"
import { causes, equalCauses, errorCauseFunctions, errors } from "./utils/cause.js"

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
      assertInclude(ex.toString(), "InterruptedException: my message")

      // In Node.js environments, ensure the 'inspect' method includes line information
      if (typeof window === "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { inspect } = require("node:util")
        assertInclude(inspect(ex), "Cause.test.ts:39") // <= reference to the line above
      }
    })
  })

  describe("UnknownException", () => {
    it("exposes its `error` property", () => {
      strictEqual(new Cause.UnknownException("my message").error, "my message")
      const { error } = new Cause.UnknownException(new Error("my error"))
      assertTrue(Predicate.isError(error))
      strictEqual(error.message, "my error")
    })

    it("exposes its `cause` property", () => {
      strictEqual(new Cause.UnknownException("my message").cause, "my message")
      const err2 = new Cause.UnknownException(new Error("my error"))
      assertTrue(Predicate.isError(err2.cause))
      strictEqual(err2.cause.message, "my error")
    })

    it("uses a default message when none is provided", () => {
      strictEqual(new Cause.UnknownException("my message").message, "An unknown error occurred")
    })

    it("accepts a custom override message", () => {
      strictEqual(new Cause.UnknownException(new Error("my error"), "my message").message, "my message")
    })
  })

  it("[internal] prettyErrorMessage converts errors into readable JSON-like strings", () => {
    class Error1 {
      readonly _tag = "WithTag"
    }
    strictEqual(internal.prettyErrorMessage(new Error1()), `{"_tag":"WithTag"}`)
    class Error2 {
      readonly _tag = "WithMessage"
      readonly message = "my message"
    }
    strictEqual(internal.prettyErrorMessage(new Error2()), `{"_tag":"WithMessage","message":"my message"}`)
    class Error3 {
      readonly _tag = "WithName"
      readonly name = "my name"
    }
    strictEqual(internal.prettyErrorMessage(new Error3()), `{"_tag":"WithName","name":"my name"}`)
    class Error4 {
      readonly _tag = "WithName"
      readonly name = "my name"
      readonly message = "my message"
    }
    strictEqual(
      internal.prettyErrorMessage(new Error4()),
      `{"_tag":"WithName","name":"my name","message":"my message"}`
    )
    class Error5 {
      readonly _tag = "WithToString"
      toString() {
        return "Error: my string"
      }
    }
    strictEqual(internal.prettyErrorMessage(new Error5()), `Error: my string`)
  })

  describe("Cause prototype", () => {
    describe("toJSON / [NodeInspectSymbol]", () => {
      const expectJSON = (cause: Cause.Cause<unknown>, expected: unknown) => {
        deepStrictEqual(cause.toJSON(), expected)
        deepStrictEqual(cause[Inspectable.NodeInspectSymbol](), expected)
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
        strictEqual(String(Cause.empty), `All fibers interrupted without errors.`)
      })

      it("Fail", () => {
        strictEqual(String(Cause.fail("my failure")), `Error: my failure`)
        assertInclude(String(Cause.fail(new Error("my failure"))), "Error: my failure")
      })

      it("Die", () => {
        strictEqual(String(Cause.die("die message")), `Error: die message`)
        assertInclude(String(Cause.die(new Error("die message"))), "Error: die message")
      })

      it("Interrupt", () => {
        strictEqual(String(Cause.interrupt(FiberId.none)), `All fibers interrupted without errors.`)
        strictEqual(String(Cause.interrupt(FiberId.runtime(1, 0))), `All fibers interrupted without errors.`)
        strictEqual(
          String(Cause.interrupt(FiberId.composite(FiberId.none, FiberId.runtime(1, 0)))),
          `All fibers interrupted without errors.`
        )
      })

      it("Sequential", () => {
        strictEqual(
          String(Cause.sequential(Cause.fail("failure 1"), Cause.fail("failure 2"))),
          `Error: failure 1\nError: failure 2`
        )
        const actual = String(Cause.sequential(Cause.fail(new Error("failure 1")), Cause.fail(new Error("failure 2"))))
        assertInclude(actual, "Error: failure 1")
        assertInclude(actual, "Error: failure 2")
      })

      it("Parallel", () => {
        strictEqual(
          String(Cause.parallel(Cause.fail("failure 1"), Cause.fail("failure 2"))),
          `Error: failure 1\nError: failure 2`
        )
        const actual = String(
          String(Cause.parallel(Cause.fail(new Error("failure 1")), Cause.fail(new Error("failure 2"))))
        )
        assertInclude(actual, "Error: failure 1")
        assertInclude(actual, "Error: failure 2")
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
        assertFalse(Equal.equals(Cause.die(0), Cause.fail(0)))
        assertFalse(
          Equal.equals(
            Cause.parallel(Cause.fail("fail1"), Cause.die("fail2")),
            Cause.parallel(Cause.fail("fail2"), Cause.die("fail1"))
          )
        )
        assertFalse(
          Equal.equals(
            Cause.sequential(Cause.fail("fail1"), Cause.die("fail2")),
            Cause.parallel(Cause.fail("fail1"), Cause.die("fail2"))
          )
        )
      })
    })
  })

  describe("Guards", () => {
    it("isCause", () => {
      assertTrue(Cause.isCause(empty))
      assertTrue(Cause.isCause(failure))
      assertTrue(Cause.isCause(defect))
      assertTrue(Cause.isCause(interruption))
      assertTrue(Cause.isCause(sequential))
      assertTrue(Cause.isCause(parallel))

      assertFalse(Cause.isCause({}))
    })

    it("isEmptyType", () => {
      assertTrue(Cause.isEmptyType(empty))
      assertFalse(Cause.isEmptyType(failure))
      assertFalse(Cause.isEmptyType(defect))
      assertFalse(Cause.isEmptyType(interruption))
      assertFalse(Cause.isEmptyType(sequential))
      assertFalse(Cause.isEmptyType(parallel))
    })

    it("isFailType", () => {
      assertFalse(Cause.isFailType(empty))
      assertTrue(Cause.isFailType(failure))
      assertFalse(Cause.isFailType(defect))
      assertFalse(Cause.isFailType(interruption))
      assertFalse(Cause.isFailType(sequential))
      assertFalse(Cause.isFailType(parallel))
    })

    it("isDieType", () => {
      assertFalse(Cause.isDieType(empty))
      assertFalse(Cause.isDieType(failure))
      assertTrue(Cause.isDieType(defect))
      assertFalse(Cause.isDieType(interruption))
      assertFalse(Cause.isDieType(sequential))
      assertFalse(Cause.isDieType(parallel))
    })

    it("isInterruptType", () => {
      assertFalse(Cause.isInterruptType(empty))
      assertFalse(Cause.isInterruptType(failure))
      assertFalse(Cause.isInterruptType(defect))
      assertTrue(Cause.isInterruptType(interruption))
      assertFalse(Cause.isInterruptType(sequential))
      assertFalse(Cause.isInterruptType(parallel))
    })

    it("isSequentialType", () => {
      assertFalse(Cause.isSequentialType(empty))
      assertFalse(Cause.isSequentialType(failure))
      assertFalse(Cause.isSequentialType(defect))
      assertFalse(Cause.isSequentialType(interruption))
      assertTrue(Cause.isSequentialType(sequential))
      assertFalse(Cause.isSequentialType(parallel))
    })

    it("isParallelType", () => {
      assertFalse(Cause.isParallelType(empty))
      assertFalse(Cause.isParallelType(failure))
      assertFalse(Cause.isParallelType(defect))
      assertFalse(Cause.isParallelType(interruption))
      assertFalse(Cause.isParallelType(sequential))
      assertTrue(Cause.isParallelType(parallel))
    })
  })

  describe("Getters", () => {
    it("isEmpty", () => {
      assertTrue(Cause.isEmpty(empty))
      assertTrue(Cause.isEmpty(Cause.sequential(empty, empty)))
      assertTrue(Cause.isEmpty(Cause.parallel(empty, empty)))
      assertTrue(Cause.isEmpty(Cause.parallel(empty, Cause.sequential(empty, empty))))
      assertTrue(Cause.isEmpty(Cause.sequential(empty, Cause.parallel(empty, empty))))

      assertFalse(Cause.isEmpty(defect))
      assertFalse(Cause.isEmpty(Cause.sequential(empty, failure)))
      assertFalse(Cause.isEmpty(Cause.parallel(empty, failure)))
      assertFalse(Cause.isEmpty(Cause.parallel(empty, Cause.sequential(empty, failure))))
      assertFalse(Cause.isEmpty(Cause.sequential(empty, Cause.parallel(empty, failure))))
    })

    it("isFailure", () => {
      assertTrue(Cause.isFailure(failure))
      assertTrue(Cause.isFailure(Cause.sequential(empty, failure)))
      assertTrue(Cause.isFailure(Cause.parallel(empty, failure)))
      assertTrue(Cause.isFailure(Cause.parallel(empty, Cause.sequential(empty, failure))))
      assertTrue(Cause.isFailure(Cause.sequential(empty, Cause.parallel(empty, failure))))

      assertFalse(Cause.isFailure(Cause.sequential(empty, Cause.parallel(empty, empty))))
    })

    it("isDie", () => {
      assertTrue(Cause.isDie(defect))
      assertTrue(Cause.isDie(Cause.sequential(empty, defect)))
      assertTrue(Cause.isDie(Cause.parallel(empty, defect)))
      assertTrue(Cause.isDie(Cause.parallel(empty, Cause.sequential(empty, defect))))
      assertTrue(Cause.isDie(Cause.sequential(empty, Cause.parallel(empty, defect))))

      assertFalse(Cause.isDie(Cause.sequential(empty, Cause.parallel(empty, empty))))
    })

    it("isInterrupted", () => {
      assertTrue(Cause.isInterrupted(interruption))
      assertTrue(Cause.isInterrupted(Cause.sequential(empty, interruption)))
      assertTrue(Cause.isInterrupted(Cause.parallel(empty, interruption)))
      assertTrue(Cause.isInterrupted(Cause.parallel(empty, Cause.sequential(empty, interruption))))
      assertTrue(Cause.isInterrupted(Cause.sequential(empty, Cause.parallel(empty, interruption))))

      assertTrue(Cause.isInterrupted(Cause.sequential(failure, interruption)))
      assertTrue(Cause.isInterrupted(Cause.parallel(failure, interruption)))
      assertTrue(Cause.isInterrupted(Cause.parallel(failure, Cause.sequential(empty, interruption))))
      assertTrue(Cause.isInterrupted(Cause.sequential(failure, Cause.parallel(empty, interruption))))

      assertFalse(Cause.isInterrupted(Cause.sequential(empty, Cause.parallel(empty, empty))))
    })

    it("isInterruptedOnly", () => {
      assertTrue(Cause.isInterruptedOnly(interruption))
      assertTrue(Cause.isInterruptedOnly(Cause.sequential(empty, interruption)))
      assertTrue(Cause.isInterruptedOnly(Cause.parallel(empty, interruption)))
      assertTrue(Cause.isInterruptedOnly(Cause.parallel(empty, Cause.sequential(empty, interruption))))
      assertTrue(Cause.isInterruptedOnly(Cause.sequential(empty, Cause.parallel(empty, interruption))))
      // Cause.empty is considered a valid candidate
      assertTrue(Cause.isInterruptedOnly(Cause.sequential(empty, Cause.parallel(empty, empty))))

      assertFalse(Cause.isInterruptedOnly(Cause.sequential(failure, interruption)))
      assertFalse(Cause.isInterruptedOnly(Cause.parallel(failure, interruption)))
      assertFalse(Cause.isInterruptedOnly(Cause.parallel(failure, Cause.sequential(empty, interruption))))
      assertFalse(Cause.isInterruptedOnly(Cause.sequential(failure, Cause.parallel(empty, interruption))))
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
      strictEqual(Cause.size(empty), 0)
      strictEqual(Cause.size(failure), 1)
      strictEqual(Cause.size(defect), 1)
      strictEqual(Cause.size(Cause.parallel(Cause.fail("error1"), Cause.fail("error2"))), 2)
      strictEqual(Cause.size(Cause.sequential(Cause.fail("error1"), Cause.fail("error2"))), 2)
      strictEqual(Cause.size(Cause.parallel(failure, defect)), 2)
      strictEqual(Cause.size(Cause.sequential(failure, defect)), 2)
      strictEqual(Cause.size(Cause.sequential(interruption, Cause.parallel(empty, failure))), 2)
      strictEqual(Cause.size(Cause.sequential(interruption, Cause.parallel(defect, failure))), 3)
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
        assertLeft(Cause.failureOrCause(cause), expected)
      }
      const expectRight = (cause: Cause.Cause<never>) => {
        assertRight(Cause.failureOrCause(cause), cause)
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
      assertSome(Cause.flipCauseOption(empty), empty)
      assertSome(Cause.flipCauseOption(defect), defect)
      assertSome(Cause.flipCauseOption(interruption), interruption)
      assertNone(Cause.flipCauseOption(Cause.fail(Option.none())))
      assertSome(Cause.flipCauseOption(Cause.fail(Option.some("error"))), Cause.fail("error"))
      // sequential
      assertSome(
        Cause.flipCauseOption(Cause.sequential(Cause.fail(Option.some("error1")), Cause.fail(Option.some("error2")))),
        Cause.sequential(Cause.fail("error1"), Cause.fail("error2"))
      )
      assertSome(
        Cause.flipCauseOption(Cause.sequential(Cause.fail(Option.some("error1")), Cause.fail(Option.none()))),
        Cause.fail("error1")
      )
      assertSome(
        Cause.flipCauseOption(Cause.sequential(Cause.fail(Option.none()), Cause.fail(Option.some("error2")))),
        Cause.fail("error2")
      )
      assertNone(
        Cause.flipCauseOption(Cause.sequential(Cause.fail(Option.none()), Cause.fail(Option.none())))
      )
      // parallel
      assertSome(
        Cause.flipCauseOption(Cause.parallel(Cause.fail(Option.some("error1")), Cause.fail(Option.some("error2")))),
        Cause.parallel(Cause.fail("error1"), Cause.fail("error2"))
      )
      assertSome(
        Cause.flipCauseOption(Cause.parallel(Cause.fail(Option.some("error1")), Cause.fail(Option.none()))),
        Cause.fail("error1")
      )
      assertSome(
        Cause.flipCauseOption(Cause.parallel(Cause.fail(Option.none()), Cause.fail(Option.some("error2")))),
        Cause.fail("error2")
      )
      assertNone(
        Cause.flipCauseOption(Cause.parallel(Cause.fail(Option.none()), Cause.fail(Option.none())))
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
      assertNone(Cause.keepDefects(empty))
      assertNone(Cause.keepDefects(failure))
      assertSome(Cause.keepDefects(defect), defect)
      assertSome(
        Cause.keepDefects(Cause.sequential(Cause.die("defect1"), Cause.die("defect2"))),
        Cause.sequential(Cause.die("defect1"), Cause.die("defect2"))
      )
      assertNone(Cause.keepDefects(Cause.sequential(empty, empty)))
      assertSome(Cause.keepDefects(Cause.sequential(defect, failure)), defect)
      assertNone(Cause.keepDefects(Cause.parallel(empty, empty)))
      assertSome(Cause.keepDefects(Cause.parallel(defect, failure)), defect)
      assertSome(
        Cause.keepDefects(Cause.parallel(Cause.die("defect1"), Cause.die("defect2"))),
        Cause.parallel(Cause.die("defect1"), Cause.die("defect2"))
      )
      assertSome(
        Cause.keepDefects(
          Cause.sequential(failure, Cause.parallel(Cause.die("defect1"), Cause.die("defect2")))
        ),
        Cause.parallel(Cause.die("defect1"), Cause.die("defect2"))
      )
      assertSome(
        Cause.keepDefects(
          Cause.sequential(Cause.die("defect1"), Cause.parallel(failure, Cause.die("defect2")))
        ),
        Cause.sequential(Cause.die("defect1"), Cause.die("defect2"))
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
      assertSome(stripNumberFormatException(empty), empty)
      assertSome(stripNumberFormatException(failure), failure)
      assertSome(stripNumberFormatException(interruption), interruption)
      assertNone(stripNumberFormatException(cause1))
      assertNone(stripNumberFormatException(Cause.sequential(cause1, cause1)))
      assertSome(stripNumberFormatException(Cause.sequential(cause1, cause2)), cause2)
      assertSome(stripNumberFormatException(Cause.sequential(cause2, cause1)), cause2)
      assertSome(
        stripNumberFormatException(Cause.sequential(cause2, cause2)),
        Cause.sequential(cause2, cause2)
      )
      assertNone(stripNumberFormatException(Cause.parallel(cause1, cause1)))
      assertSome(stripNumberFormatException(Cause.parallel(cause1, cause2)), cause2)
      assertSome(stripNumberFormatException(Cause.parallel(cause2, cause1)), cause2)
      assertSome(
        stripNumberFormatException(Cause.parallel(cause2, cause2)),
        Cause.parallel(cause2, cause2)
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
          strictEqual(Cause.pretty(Cause.interrupt(FiberId.none)), "All fibers interrupted without errors.")
          strictEqual(Cause.pretty(Cause.interrupt(FiberId.runtime(1, 0))), "All fibers interrupted without errors.")
          strictEqual(
            Cause.pretty(Cause.interrupt(FiberId.composite(FiberId.none, FiberId.runtime(1, 0)))),
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

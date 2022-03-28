import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { Either } from "../../../src/data/Either"
import { NoSuchElementException } from "../../../src/data/GlobalExceptions"
import { Option } from "../../../src/data/Option"
import { RuntimeError } from "../../../src/io/Cause"
import { Exit } from "../../../src/io/Exit"
import { STM } from "../../../src/stm/STM"
import { TRef } from "../../../src/stm/TRef"
import { ExampleError } from "./utils"

describe("STM", () => {
  describe("Using `STM.atomically` to perform different computations and call:", () => {
    describe("absolve to convert", () => {
      it("a successful Right computation into the success channel", async () => {
        const program = STM.succeed(Either.right(42)).absolve().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(42)
      })

      it("a successful Left computation into the error channel", async () => {
        const program = STM.succeed(Either.left("oh no!")).absolve().commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("oh no!"))
      })
    })

    it("catchAll errors", async () => {
      const program = (STM.fail("uh oh!") > STM.succeed("everything is fine"))
        .catchAll((s) => STM.succeed(`${s} phew`))
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("uh oh! phew")
    })

    describe("catchSome errors", () => {
      it("catch the specified error", async () => {
        type ErrorTest = Error1

        interface Error1 {
          readonly _tag: "Error1"
        }

        const program = (
          STM.fail<ErrorTest>({ _tag: "Error1" }) > STM.succeed("everything is fine")
        )
          .catchSome((e) =>
            e._tag === "Error1" ? Option.some(STM.succeed("gotcha")) : Option.none
          )
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe("gotcha")
      })

      it("lets the error pass", async () => {
        type ErrorTest = Error1 | Error2

        interface Error1 {
          readonly _tag: "Error1"
        }

        interface Error2 {
          readonly _tag: "Error2"
        }

        const program = (
          STM.fail<ErrorTest>({ _tag: "Error2" }) > STM.succeed("everything is fine")
        )
          .catchSome((e) =>
            e._tag === "Error1" ? Option.some(STM.succeed("gotcha")) : Option.none
          )
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail({ _tag: "Error2" }))
      })
    })

    // TODO: implement after TQueue
    it.skip("repeatWhile to run effect while it satisfies predicate", async () => {
      // (for {
      //   a <- TQueue.bounded[Int](5)
      //   _ <- a.offerAll(List(0, 0, 0, 1, 2))
      //   n <- a.take.repeatWhile(_ == 0)
      // } yield assert(n)(equalTo(1))).commit
    })

    // TODO: implement after TQueue
    it.skip("repeatUntil to run effect until it satisfies predicate", async () => {
      // (for {
      //   a <- TQueue.bounded[Int](5)
      //   _ <- a.offerAll(List(0, 0, 0, 1, 2))
      //   b <- a.take.repeatUntil(_ == 1)
      // } yield assert(b)(equalTo(1))).commit
    })

    describe("either to convert", () => {
      it("a successful computation into Right(a)", async () => {
        const program = STM.succeed(42).either().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Either.right(42))
      })

      it("a failed computation into Left(e)", async () => {
        const program = STM.fail("oh no!").either().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Either.left("oh no!"))
      })
    })

    it("eventually succeeds", async () => {
      function stm(ref: TRef<number>): STM<unknown, string, number> {
        return ref
          .get()
          .flatMap((n) =>
            n < 10 ? ref.update((n) => n + 1) > STM.fail("ouch") : STM.succeed(n)
          )
      }

      const program = TRef.make(0)
        .flatMap((ref) => stm(ref).eventually())
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("failed to make a failed computation and check the value", async () => {
      const program = STM.fail("bye bye world").commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("bye bye world"))
    })

    it("filter filters a collection using an effectual predicate", async () => {
      const program = STM.Do()
        .bind("ref", () => TRef.make(List.empty<number>()))
        .bind("results", ({ ref }) =>
          STM.filter([2, 4, 6, 3, 5, 6], (n) =>
            ref.update((list) => list.append(n)).as(n % 2 === 0)
          ).map((chunk) => chunk.toArray())
        )
        .bind("effects", ({ ref }) => ref.get())
        .commit()

      const { effects, results } = await program.unsafeRunPromise()

      expect(results).toEqual([2, 4, 6, 6])
      expect(effects).toEqual(List(2, 4, 6, 3, 5, 6))
    })

    it("filterOrDie dies when predicate fails", async () => {
      const program = STM.succeed(1)
        .filterOrDie((n) => n !== 1, ExampleError)
        .commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(ExampleError))
    })

    it("filterOrDieMessage dies with message when predicate fails ", async () => {
      const program = STM.succeed(1)
        .filterOrDieMessage((n) => n !== 1, "dies")
        .commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.die(new RuntimeError("dies")))
    })

    describe("filterOrElse", () => {
      it("returns checked failure", async () => {
        const program = STM.succeed(1)
          .filterOrElse((n) => n === 1, STM.succeed(2))
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })

      it("returns held value", async () => {
        const program = STM.succeed(1)
          .filterOrElse((n) => n !== 1, STM.succeed(2))
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(2)
      })
    })

    describe("filterOrElseWith", () => {
      it("returns checked failure", async () => {
        const program = STM.succeed(1)
          .filterOrElseWith(
            (n) => n === 1,
            (n) => STM.succeed(n + 1)
          )
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })

      it("returns held value", async () => {
        const program = STM.succeed(1)
          .filterOrElseWith(
            (n) => n !== 1,
            (n) => STM.succeed(n + 1)
          )
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(2)
      })

      it("returns error", async () => {
        const program = (STM.fail(ExampleError) > STM.succeed(1))
          .filterOrElseWith(
            (n) => n !== 1,
            (n) => STM.succeed(n + 1)
          )
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(ExampleError))
      })
    })

    it("filterOrFail returns failure when predicate fails", async () => {
      const program = STM.succeed(1)
        .filterOrFail((n) => n !== 1, ExampleError)
        .commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(ExampleError))
    })

    it("flatMapError to flatMap from one error to another", async () => {
      const program = STM.fail(-1)
        .flatMapError((n) => STM.succeed(`log: ${n}`))
        .commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("log: -1"))
    })

    it("flatten", async () => {
      const program = STM.Do()
        .bind("result1", () => STM.succeed(STM.succeed("test")).flatten())
        .bind("result2", () => STM.flatten(STM.succeed(STM.succeed("test"))))
        .commit()

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe("test")
      expect(result1 === result2).toBe(true)
    })

    describe("flattenErrorOption", () => {
      it("with an existing error and return it", async () => {
        const program = STM.fail(Option.some("oh no!"))
          .flattenErrorOption("default error")
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("oh no!"))
      })

      it("with no error and default to value", async () => {
        const program = STM.fail(Option.none)
          .flattenErrorOption("default error")
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("default error"))
      })
    })

    it("fold to handle both failure and success", async () => {
      const program = STM.Do()
        .bind("result1", () =>
          STM.succeed("yes").fold(
            () => -1,
            () => 1
          )
        )
        .bind("result2", () =>
          STM.fail("no").fold(
            () => -1,
            () => 1
          )
        )
        .commit()

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe(1)
      expect(result2).toBe(-1)
    })

    it("foldSTM to fold over the `STM` effect, and handle failure and success", async () => {
      const program = STM.Do()
        .bind("result1", () =>
          STM.succeed("yes").foldSTM(() => STM.succeed("no"), STM.succeedNow)
        )
        .bind("result2", () =>
          STM.fail("no").foldSTM(STM.succeedNow, () => STM.succeed("yes"))
        )
        .commit()

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe("yes")
      expect(result2).toBe("no")
    })

    describe("foldLeft", () => {
      it("with a successful step function sums the list properly", async () => {
        const program = STM.reduce(List(1, 2, 3, 4, 5), 0, (acc, n) =>
          STM.succeed(acc + n)
        ).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(15)
      })

      it("with a failing step function returns a failed transaction", async () => {
        const program = STM.reduce(List(1), 0, () => STM.fail("fail")).commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("fail"))
      })

      it("run sequentially from left to right", async () => {
        const program = STM.reduce(
          List(1, 2, 3, 4, 5),
          List.empty<number>(),
          (acc, n) => STM.succeed(acc.append(n))
        ).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(List(1, 2, 3, 4, 5))
      })
    })

    describe("foldRight", () => {
      it("with a successful step function sums the list properly", async () => {
        const program = STM.reduceRight(List(1, 2, 3, 4, 5), 0, (acc, n) =>
          STM.succeed(acc + n)
        ).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(15)
      })

      it("with a failing step function returns a failed transaction", async () => {
        const program = STM.reduceRight(List(1, 2, 3, 4, 5), 0, (acc, n) =>
          STM.fail("fail")
        ).commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("fail"))
      })

      it("run sequentially from right to left", async () => {
        const program = STM.reduceRight(
          List(1, 2, 3, 4, 5),
          List.empty<number>(),
          (n, acc) => STM.succeed(acc.append(n))
        ).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(List(5, 4, 3, 2, 1))
      })
    })

    describe("head", () => {
      it("extracts the value from the List", async () => {
        const program = STM.succeed(List(1, 2)).head.commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })

      it("returns None if list is Empty", async () => {
        const program = STM.succeed(List.empty<number>()).head.commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Option.none))
      })

      it("returns the Error around Some", async () => {
        const program = STM.fromEither(
          Either.leftW<string, List<number>>("my error")
        ).head.commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Option.some("my error")))
      })
    })

    describe("ifSTM", () => {
      it("runs `onTrue` if result of `b` is `true`", async () => {
        const program = STM.ifSTM(
          STM.succeed(true),
          STM.succeed(true),
          STM.succeed(false)
        ).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(true)
      })

      it("runs `onFalse` if result of `b` is `false`", async () => {
        const program = STM.ifSTM(
          STM.succeed(false),
          STM.succeed(true),
          STM.succeed(false)
        ).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(false)
      })
    })

    describe("left", () => {
      it("on Left value", async () => {
        const program = STM.succeed(Either.left("left")).left.commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe("left")
      })

      it("on Right value", async () => {
        const program = STM.succeed(Either.right("right")).left.commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Either.right("right")))
      })

      it("on failure", async () => {
        const program = STM.fail("fail").left.commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Either.left("fail")))
      })

      it("lifting a value", async () => {
        const program = STM.left(42).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Either.left(42))
      })
    })

    describe("mapBoth when", () => {
      it("having a success value", async () => {
        const program = STM.succeed(1)
          .mapBoth(
            () => -1,
            (n) => `${n} as string`
          )
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe("1 as string")
      })

      it("having a fail value", async () => {
        const program = STM.fail(-1)
          .mapBoth(
            (n) => `${n} as string`,
            () => 0
          )
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("-1 as string"))
      })
    })

    it("mapError to map from one error to another", async () => {
      const program = STM.fail(-1)
        .mapError(() => "oh no!")
        .commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("oh no!"))
    })

    describe("merge", () => {
      it("on error with same type", async () => {
        const program = STM.fromEither<number, number>(Either.left(1)).merge().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })

      it("when having a successful value", async () => {
        const program = STM.fromEither<number, number>(Either.right(1)).merge().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })
    })

    describe("none", () => {
      it("when A is None", async () => {
        const program = STM.succeed(Option.none).noneOrFail().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBeUndefined()
      })

      it("when Error", async () => {
        const program = STM.fail(ExampleError).noneOrFail().commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Option.some(ExampleError)))
      })

      it("when A is Some(a)", async () => {
        const program = STM.succeed(Option.some(1)).noneOrFail().commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Option.none))
      })

      it("lifting a value", async () => {
        const program = STM.none.commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Option.none)
      })
    })

    describe("option to convert:", () => {
      it("a successful computation into Some(a)", async () => {
        const program = STM.succeed(42).option().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Option.some(42))
      })

      it("a failed computation into None", async () => {
        const program = STM.fail("oh no!").option().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Option.none)
      })
    })

    describe("optional to convert:", () => {
      it("a Some(e) in E to a e in E", async () => {
        const program = STM.fromEither<Option<string>, number>(
          Either.left(Option.some("my error"))
        )
          .unsome()
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("my error"))
      })

      it("a None in E into None in A", async () => {
        const program = STM.fromEither<Option<string>, number>(Either.left(Option.none))
          .unsome()
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Option.none)
      })

      it("no error", async () => {
        const program = STM.fromEither<Option<string>, number>(Either.right(42))
          .unsome()
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Option.some(42))
      })
    })

    describe("orDie", () => {
      it("when failure should die", async () => {
        const program = STM.fail(() => {
          throw ExampleError
        })
          .orDie()
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.die(ExampleError))
      })

      it("when succeed should keep going", async () => {
        const program = STM.succeed(1).orDie().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })
    })

    describe("orDieWith", () => {
      it("when failure should die", async () => {
        const program = STM.fail("-1")
          .orDieWith((s) => new Error(s))
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.die(new Error("-1")))
      })

      it("when succeed should keep going", async () => {
        const program = STM.fromEither<string, number>(Either.right(1))
          .orDieWith((s) => new Error(s))
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })
    })

    describe("partition", () => {
      it("collects only successes", async () => {
        const input = List.range(0, 10)
        const program = STM.partition(input, STM.succeedNow).commit()

        const {
          tuple: [left, right]
        } = await program.unsafeRunPromise()

        expect(left).toEqual(List.empty())
        expect(right).toEqual(input)
      })

      it("collects only failures", async () => {
        const input = List.from(Array.from({ length: 10 }, () => 0))
        const program = STM.partition(input, STM.failNow).commit()

        const {
          tuple: [left, right]
        } = await program.unsafeRunPromise()

        expect(left).toEqual(input)
        expect(right).toEqual(List.empty())
      })

      it("collects failures and successes", async () => {
        const input = List.range(0, 10)
        const program = STM.partition(input, (n) =>
          n % 2 === 0 ? STM.fail(n) : STM.succeed(n)
        ).commit()

        const {
          tuple: [left, right]
        } = await program.unsafeRunPromise()

        expect(left).toEqual(List(0, 2, 4, 6, 8))
        expect(right).toEqual(List(1, 3, 5, 7, 9))
      })

      it("evaluates effects in correct order", async () => {
        const input = List(2, 4, 6, 3, 5, 6)
        const program = STM.Do()
          .bind("ref", () => TRef.make(List.empty<number>()))
          .tap(({ ref }) =>
            STM.partition(input, (n) => ref.update((list) => list.append(n)))
          )
          .flatMap(({ ref }) => ref.get())
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(List(2, 4, 6, 3, 5, 6))
      })
    })

    describe("reject", () => {
      it("returns failure ignoring value", async () => {
        const program = STM.succeed(0)
          .reject((n) => (n !== 0 ? Option.some("partial failed") : Option.none))
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(0)
      })

      it("returns failure ignoring value", async () => {
        const program = STM.succeed(1)
          .reject((n) => (n !== 0 ? Option.some("partial failed") : Option.none))
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("partial failed"))
      })
    })

    describe("rejectSTM", () => {
      it("doesnt collect value", async () => {
        const program = STM.succeed(0)
          .rejectSTM((n) =>
            n !== 0 ? Option.some(STM.succeed("partial failed")) : Option.none
          )
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(0)
      })

      it("returns failure ignoring value", async () => {
        const program = STM.succeed(1)
          .rejectSTM((n) =>
            n !== 0 ? Option.some(STM.succeed("partial failed")) : Option.none
          )
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail("partial failed"))
      })
    })

    describe("replicate", () => {
      it("zero", async () => {
        const program = STM.collectAll(STM.replicate(0, STM.succeed(12)))
          .commit()
          .map((chunk) => chunk.toArray())

        const result = await program.unsafeRunPromise()

        expect(result).toEqual([])
      })

      it("negative", async () => {
        const program = STM.collectAll(STM.replicate(-2, STM.succeed(12)))
          .commit()
          .map((chunk) => chunk.toArray())

        const result = await program.unsafeRunPromise()

        expect(result).toEqual([])
      })

      it("positive", async () => {
        const program = STM.collectAll(STM.replicate(2, STM.succeed(12)))
          .commit()
          .map((chunk) => chunk.toArray())

        const result = await program.unsafeRunPromise()

        expect(result).toEqual([12, 12])
      })
    })

    describe("right", () => {
      it("on Right value", async () => {
        const program = STM.succeed(Either.right("right")).right.commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual("right")
      })

      it("on Left value", async () => {
        const program = STM.succeed(Either.left("left")).right.commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Either.left("left")))
      })

      it("on failure", async () => {
        const program = STM.fail("fail").right.commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Either.right("fail")))
      })

      it("lifting a value", async () => {
        const program = STM.right(42).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Either.right(42))
      })
    })

    describe("some", () => {
      it("extracts the value from Some", async () => {
        const program = STM.succeed(Option.some(1)).some.commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })

      it("fails on None", async () => {
        const program = STM.succeed(Option.none).some.commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Option.none))
      })

      it("fails when given an exception", async () => {
        const program = STM.fail(ExampleError).some.commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(Option.some(ExampleError)))
      })

      it("lifting a value", async () => {
        const program = STM.some(42).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toEqual(Option.some(42))
      })
    })

    describe("someOrElse", () => {
      it("extracts the value from Some", async () => {
        const program = STM.succeed(Option.some(1)).someOrElse(42).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })

      it("falls back to the default value if None", async () => {
        const program = STM.succeed(Option.none).someOrElse(42).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(42)
      })

      it("does not change failed state", async () => {
        const program = STM.fail(ExampleError).someOrElse(42).commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(ExampleError))
      })
    })

    describe("someOrElseSTM", () => {
      it("extracts the value from Some", async () => {
        const program = STM.succeed(Option.some(1))
          .someOrElseSTM(STM.succeed(42))
          .commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })

      it("falls back to the default value if None", async () => {
        const program = STM.succeed(Option.none).someOrElseSTM(STM.succeed(42)).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(42)
      })

      it("does not change failed state", async () => {
        const program = STM.fail(ExampleError).someOrElseSTM(STM.succeed(42)).commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(ExampleError))
      })
    })

    describe("someOrFail", () => {
      it("extracts the value from Some", async () => {
        const program = STM.succeed(Option.some(1)).someOrFail(ExampleError).commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(1)
      })

      it("fails on None", async () => {
        const program = STM.succeed(Option.none).someOrFail(ExampleError).commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(ExampleError))
      })

      it("fails with the original error", async () => {
        const program = STM.fail(ExampleError)
          .someOrFail(new Error("not example"))
          .commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(ExampleError))
      })
    })

    describe("someOrFailException", () => {
      it("extracts the optional value", async () => {
        const program = STM.succeed(Option.some(42)).someOrFailException().commit()

        const result = await program.unsafeRunPromise()

        expect(result).toBe(42)
      })

      it("fails when given a None", async () => {
        const program = STM.succeed(Option.none).someOrFailException().commit()

        const result = await program.unsafeRunPromiseExit()

        expect(result.untraced()).toEqual(Exit.fail(new NoSuchElementException()))
      })
    })

    it("succeed to make a successful computation and check the value", async () => {
      const program = STM.succeed("hello world").commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("hello world")
    })

    describe("summarized", () => {
      it("returns summary and value", async () => {
        const program = STM.Do()
          .bind("counter", () => TRef.make(0))
          .bindValue("increment", ({ counter }) => counter.updateAndGet((n) => n + 1))
          .flatMap(({ increment }) =>
            increment.summarized(increment, (start, end) => Tuple(start, end))
          )
          .commit()

        const {
          tuple: [
            {
              tuple: [start, end]
            },
            value
          ]
        } = await program.unsafeRunPromise()

        expect(start).toBe(1)
        expect(end).toBe(3)
        expect(value).toBe(2)
      })
    })

    it("zip to return a tuple of two computations", async () => {
      const program = STM.succeed(1).zip(STM.succeed("A")).commit()

      const {
        tuple: [n, s]
      } = await program.unsafeRunPromise()

      expect(n).toBe(1)
      expect(s).toBe("A")
    })

    it("zipWith to perform an action to two computations", async () => {
      const program = STM.succeed(598)
        .zipWith(STM.succeed(2), (a, b) => a + b)
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(600)
    })
  })
})

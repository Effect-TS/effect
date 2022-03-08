import { Chunk } from "../../src/collection/immutable/Chunk"
import { List } from "../../src/collection/immutable/List"
import { Tuple } from "../../src/collection/immutable/Tuple"
import { Either } from "../../src/data/Either"
import { constVoid } from "../../src/data/Function"
import { NoSuchElementException } from "../../src/data/GlobalExceptions"
import { tag } from "../../src/data/Has"
import { Option } from "../../src/data/Option"
import { Cause, RuntimeError } from "../../src/io/Cause"
import type { HasClock } from "../../src/io/Clock"
import type { IO, UIO } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import { Exit } from "../../src/io/Exit"
import { Promise } from "../../src/io/Promise"
import { STM } from "../../src/stm/STM"
import { TRef } from "../../src/stm/TRef"

const ExampleError = new Error("fail")

class UnpureBarrier {
  #isOpen = false

  open(): void {
    this.#isOpen = true
  }

  await(): Effect<HasClock, never, void> {
    return Effect.suspend(
      Effect.attempt(() => {
        if (this.#isOpen) {
          return undefined
        }
        throw new Error()
      })
    ).eventually()
  }
}

function incrementRefN(n: number, ref: TRef<number>): Effect<HasClock, never, number> {
  return STM.atomically(
    ref
      .get()
      .tap((value) => ref.set(value + 1))
      .tap(() => ref.get())
  ).repeatN(n)
}

function compute3RefN(
  n: number,
  ref1: TRef<number>,
  ref2: TRef<number>,
  ref3: TRef<number>
): Effect<HasClock, never, number> {
  return STM.atomically(
    STM.Do()
      .bind("value1", () => ref1.get())
      .bind("value2", () => ref2.get())
      .tap(({ value1, value2 }) => ref3.set(value1 + value2))
      .bind("value3", () => ref3.get())
      .tap(({ value1 }) => ref1.set(value1 - 1))
      .tap(({ value2 }) => ref2.set(value2 + 1))
      .map(({ value3 }) => value3)
  ).repeatN(n)
}

function transfer(
  receiver: TRef<number>,
  sender: TRef<number>,
  much: number
): UIO<number> {
  return STM.atomically(
    sender
      .get()
      .tap((balance) => STM.check(balance >= much))
      .tap(() => receiver.update((n) => n + much))
      .tap(() => sender.update((n) => n - much))
      .zipRight(receiver.get())
  )
}

function permutation(
  tRef1: TRef<number>,
  tRef2: TRef<number>
): STM<unknown, never, void> {
  return STM.struct({
    a: tRef1.get(),
    b: tRef2.get()
  })
    .flatMap(({ a, b }) => tRef1.set(b) > tRef2.set(a))
    .map(constVoid)
}

function chain(
  depth: number,
  next: (_: STM<unknown, never, number>) => STM<unknown, never, number>
): UIO<number> {
  return chainLoop(depth, STM.succeed(0), next)
}

function chainLoop(
  n: number,
  acc: STM<unknown, never, number>,
  next: (_: STM<unknown, never, number>) => STM<unknown, never, number>
): UIO<number> {
  return n <= 0
    ? acc.commit()
    : Effect.suspendSucceed(chainLoop(n - 1, next(acc), next))
}

export const STMEnvId = Symbol.for("@effect-ts/core/test/stm/STMEnv")
export type STMEnvId = typeof STMEnvId

/**
 * @tsplus type ets/STMTestEnv
 */
export interface STMEnv {
  readonly ref: TRef<number>
}

/**
 * @tsplus type ets/STMTestEnvOps
 */
export interface STMEnvOps {}
export const STMEnv: STMEnvOps = {}

/**
 * @tsplus static ets/STMTestEnvOps make
 */
export function makeSTMEnv(n: number): UIO<STMEnv> {
  return TRef.makeCommit(n).map((ref) => ({ ref }))
}

export const HasSTMEnv = tag<STMEnv>()

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

  describe("Make a new `TRef` and", () => {
    it("get its initial value", async () => {
      const program = TRef.make(14)
        .flatMap((ref) => ref.get())
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(14)
    })

    it("set a new value", async () => {
      const program = TRef.make(14)
        .tap((ref) => ref.set(42))
        .flatMap((ref) => ref.get())
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(42)
    })
  })

  describe("Using `STM.atomically` perform concurrent computations", () => {
    it("increment `TRef` 100 times in 100 fibers", async () => {
      const program = Effect.Do()
        .bind("ref", () => TRef.makeCommit(0))
        .bind("fiber", ({ ref }) =>
          Effect.forkAll(List.repeat(incrementRefN(99, ref), 10))
        )
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ ref }) => ref.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1000)
    })

    it("compute a `TRef` from 2 variables, increment the first `TRef` and decrement the second `TRef` in different fibers", async () => {
      const program = Effect.Do()
        .bind("refs", () =>
          STM.atomically(TRef.make(10000) + TRef.make(0) + TRef.make(0))
        )
        .bind("fiber", ({ refs }) =>
          Effect.forkAll(
            List.repeat(compute3RefN(99, refs.get(0), refs.get(1), refs.get(2)), 10)
          )
        )
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ refs }) => refs.get(2).get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10000)
    })
  })

  describe("Using `STM.atomically` perform concurrent computations that", () => {
    describe("have a simple condition lock should suspend the whole transaction and", () => {
      it("resume directly when the condition is already satisfied", async () => {
        const program = Effect.Do()
          .bind("tref1", () => TRef.makeCommit(10))
          .bind("tref2", () => TRef.makeCommit("failed!"))
          .flatMap(({ tref1, tref2 }) =>
            tref1
              .get()
              .tap((n) => STM.check(n > 0))
              .tap(() => tref2.set("succeeded!"))
              .flatMap(() => tref2.get())
              .commit()
          )

        const result = await program.unsafeRunPromise()

        expect(result).toBe("succeeded!")
      })

      it("resume directly when the condition is already satisfied and change again the tvar with non satisfying value, the transaction shouldn't be suspended.", async () => {
        const program = Effect.Do()
          .bind("tref", () => TRef.makeCommit(42))
          .bind("join", ({ tref }) =>
            tref
              .get()
              .retryUntil((n) => n === 42)
              .commit()
          )
          .tap(({ tref }) => tref.set(9).commit())
          .bind("value", ({ tref }) => tref.get().commit())

        const { join, value } = await program.unsafeRunPromise()

        expect(join).toBe(42)
        expect(value).toBe(9)
      })

      it("resume after satisfying the condition", async () => {
        const barrier = new UnpureBarrier()
        const program = Effect.Do()
          .bind("done", () => Promise.make<never, void>())
          .bind("tref1", () => TRef.makeCommit(0))
          .bind("tref2", () => TRef.makeCommit("failed!"))
          .bind("fiber", ({ done, tref1, tref2 }) =>
            (
              STM.atomically(
                STM.Do()
                  .bind("v1", () => tref1.get())
                  .tap(() => STM.succeed(barrier.open()))
                  .tap(({ v1 }) => STM.check(v1 > 42))
                  .tap(() => tref2.set("succeeded!"))
                  .flatMap(() => tref2.get())
              ) < done.succeed(undefined)
            ).fork()
          )
          .tap(() => barrier.await())
          .bind("oldValue", ({ tref2 }) => tref2.get().commit())
          .tap(({ tref1 }) => tref1.set(43).commit())
          .tap(({ done }) => done.await())
          .bind("newValue", ({ tref2 }) => tref2.get().commit())
          .bind("join", ({ fiber }) => fiber.join())

        const { join, newValue, oldValue } = await program.unsafeRunPromise()

        expect(oldValue).toBe("failed!")
        expect(newValue).toBe(join)
      })
    })

    describe("have a complex condition lock should suspend the whole transaction and", () => {
      it("resume directly when the condition is already satisfied", async () => {
        const program = Effect.Do()
          .bind("sender", () => TRef.makeCommit(100))
          .bind("receiver", () => TRef.makeCommit(0))
          .tap(({ receiver, sender }) => transfer(receiver, sender, 150).fork())
          .tap(({ sender }) => sender.update((n) => n + 100).commit())
          .tap(({ sender }) =>
            sender
              .get()
              .retryUntil((n) => n === 50)
              .commit()
          )
          .bind("senderValue", ({ sender }) => sender.get().commit())
          .bind("receiverValue", ({ receiver }) => receiver.get().commit())

        const { receiverValue, senderValue } = await program.unsafeRunPromise()

        expect(senderValue).toBe(50)
        expect(receiverValue).toBe(150)
      })
    })

    describe("transfer an amount to a sender and send it back the account should contains the amount to transfer", () => {
      it("run both transactions sequentially in 10 fibers", async () => {
        const program = Effect.Do()
          .bind("sender", () => TRef.makeCommit(100))
          .bind("receiver", () => TRef.makeCommit(0))
          .bindValue("toReceiver", ({ receiver, sender }) =>
            transfer(receiver, sender, 150)
          )
          .bindValue("toSender", ({ receiver, sender }) =>
            transfer(sender, receiver, 150)
          )
          .bind("fiber", ({ toReceiver, toSender }) =>
            Effect.forkAll(List.repeat(toReceiver > toSender, 10))
          )
          .tap(({ sender }) => sender.update((n) => n + 50).commit())
          .tap(({ fiber }) => fiber.join())
          .bind("senderValue", ({ sender }) => sender.get().commit())
          .bind("receiverValue", ({ receiver }) => receiver.get().commit())

        const { receiverValue, senderValue } = await program.unsafeRunPromise()

        expect(senderValue).toBe(150)
        expect(receiverValue).toBe(0)
      })

      it("run 10 transactions `toReceiver` and 10 `toSender` concurrently", async () => {
        const program = Effect.Do()
          .bind("sender", () => TRef.makeCommit(50))
          .bind("receiver", () => TRef.makeCommit(0))
          .bindValue("toReceiver", ({ receiver, sender }) =>
            transfer(receiver, sender, 100)
          )
          .bindValue("toSender", ({ receiver, sender }) =>
            transfer(sender, receiver, 100)
          )
          .bind("fiber1", ({ toReceiver }) =>
            Effect.forkAll(List.repeat(toReceiver, 10))
          )
          .bind("fiber2", ({ toSender }) => Effect.forkAll(List.repeat(toSender, 10)))
          .tap(({ sender }) => sender.update((n) => n + 50).commit())
          .tap(({ fiber1 }) => fiber1.join())
          .tap(({ fiber2 }) => fiber2.join())
          .bind("senderValue", ({ sender }) => sender.get().commit())
          .bind("receiverValue", ({ receiver }) => receiver.get().commit())

        const { receiverValue, senderValue } = await program.unsafeRunPromise()

        expect(senderValue).toBe(100)
        expect(receiverValue).toBe(0)
      })

      it("run transactions `toReceiver` 10 times and `toSender` 10 times each in 100 fibers concurrently", async () => {
        const program = Effect.Do()
          .bind("sender", () => TRef.makeCommit(50))
          .bind("receiver", () => TRef.makeCommit(0))
          .bindValue("toReceiver", ({ receiver, sender }) =>
            transfer(receiver, sender, 100).repeatN(9)
          )
          .bindValue("toSender", ({ receiver, sender }) =>
            transfer(sender, receiver, 100).repeatN(9)
          )
          .bind("fiber", ({ toReceiver, toSender }) =>
            toReceiver.zipPar(toSender).fork()
          )
          .tap(({ sender }) => sender.update((n) => n + 50).commit())
          .tap(({ fiber }) => fiber.join())
          .bind("senderValue", ({ sender }) => sender.get().commit())
          .bind("receiverValue", ({ receiver }) => receiver.get().commit())

        const { receiverValue, senderValue } = await program.unsafeRunPromise()

        expect(senderValue).toBe(100)
        expect(receiverValue).toBe(0)
      })
    })

    it("perform atomically a single transaction that has a tvar for 20 fibers, each one checks the value and increment it", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bind("fiber", ({ tRef }) =>
          Effect.forkAll(
            List.range(0, 21).map((i) =>
              tRef
                .get()
                .flatMap((v) => STM.check(v === i))
                .zipRight(tRef.update((n) => n + 1).map(constVoid))
                .commit()
            )
          )
        )
        .tap(({ fiber }) => fiber.join())
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(21)
    })

    describe("perform atomically a transaction with a condition that couldn't be satisfied, it should be suspended", () => {
      it("interrupt the fiber should terminate the transaction", async () => {
        const barrier = new UnpureBarrier()
        const program = Effect.Do()
          .bind("tRef", () => TRef.makeCommit(0))
          .bind("fiber", ({ tRef }) =>
            tRef
              .get()
              .tap(() => STM.succeed(barrier.open()))
              .tap((v) => STM.check(v > 0))
              .tap(() => tRef.update((n) => 10 / n))
              .map(constVoid)
              .commit()
              .fork()
          )
          .tap(() => barrier.await())
          .tap(({ fiber }) => fiber.interrupt())
          .tap(({ tRef }) => tRef.set(10).commit())
          .flatMap(({ tRef }) => Effect.sleep(10) > tRef.get().commit())

        const result = await program.unsafeRunPromise()

        expect(result).toBe(10)
      })

      it("interrupt the fiber that has executed the transaction in 100 different fibers, should terminate all transactions", async () => {
        const barrier = new UnpureBarrier()
        const program = Effect.Do()
          .bind("tRef", () => TRef.makeCommit(0))
          .bind("fiber", ({ tRef }) =>
            Effect.forkAll(
              List.repeat(
                tRef
                  .get()
                  .tap(() => STM.succeed(barrier.open()))
                  .tap((v) => STM.check(v < 0))
                  .tap(() => tRef.set(10))
                  .commit(),
                100
              )
            )
          )
          .tap(() => barrier.await())
          .tap(({ fiber }) => fiber.interrupt())
          .tap(({ tRef }) => tRef.set(-1).commit())
          .flatMap(({ tRef }) => Effect.sleep(10) > tRef.get().commit())

        const result = await program.unsafeRunPromise()

        expect(result).toBe(-1)
      })

      it("interrupt the fiber and observe it, it should be resumed with Interrupted Cause", async () => {
        const program = Effect.Do()
          .bind("selfId", () => Effect.fiberId)
          .bind("tRef", () => TRef.makeCommit(1))
          .bind("fiber", ({ tRef }) =>
            tRef
              .get()
              .flatMap((n) => STM.check(n === 0))
              .commit()
              .fork()
          )
          .tap(({ fiber }) => fiber.interrupt())
          .bind("observe", ({ fiber }) => fiber.join().sandbox().either())

        const { observe, selfId } = await program.unsafeRunPromise()

        expect(observe.mapLeft((cause) => cause.untraced())).toEqual(
          Either.left(Cause.interrupt(selfId))
        )
      })
    })

    it("Using `continueOrRetry` filter and map simultaneously the value produced by the transaction", async () => {
      const program = STM.succeed(List.range(1, 20))
        .continueOrRetry((list) =>
          list.every((n) => n > 0) ? Option.some("positive") : Option.none
        )
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual("positive")
    })

    it("Using `continueOrRetrySTM` filter and map simultaneously the value produced by the transaction", async () => {
      const program = STM.succeed(List.range(1, 20))
        .continueOrRetrySTM((list) =>
          list.every((n) => n > 0) ? Option.some(STM.succeed("positive")) : Option.none
        )
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual("positive")
    })
  })

  it("permute 2 variables", async () => {
    const program = Effect.Do()
      .bind("tRef1", () => TRef.makeCommit(1))
      .bind("tRef2", () => TRef.makeCommit(2))
      .tap(({ tRef1, tRef2 }) => permutation(tRef1, tRef2).commit())
      .bind("value1", ({ tRef1 }) => tRef1.get().commit())
      .bind("value2", ({ tRef2 }) => tRef2.get().commit())

    const { value1, value2 } = await program.unsafeRunPromise()

    expect(value1).toBe(2)
    expect(value2).toBe(1)
  })

  it("permute 2 variables in 100 fibers, the 2 variables should contains the same values", async () => {
    const program = Effect.Do()
      .bind("tRef1", () => TRef.makeCommit(1))
      .bind("tRef2", () => TRef.makeCommit(2))
      .bind("oldValue1", ({ tRef1 }) => tRef1.get().commit())
      .bind("oldValue2", ({ tRef2 }) => tRef2.get().commit())
      .bind("fiber", ({ tRef1, tRef2 }) =>
        Effect.forkAll(List.repeat(permutation(tRef1, tRef2).commit(), 100))
      )
      .tap(({ fiber }) => fiber.join())
      .bind("value1", ({ tRef1 }) => tRef1.get().commit())
      .bind("value2", ({ tRef2 }) => tRef2.get().commit())

    const { oldValue1, oldValue2, value1, value2 } = await program.unsafeRunPromise()

    expect(value1).toBe(oldValue1)
    expect(value2).toBe(oldValue2)
  })

  describe("collectAll", () => {
    it("collects a list of transactional effects to a single transaction that produces a list of values", async () => {
      const program = Effect.Do()
        .bind("iterable", () =>
          Effect.succeed(List.range(1, 101).map((n) => TRef.make(n)))
        )
        .bind("tRefs", ({ iterable }) => STM.collectAll(iterable).commit())
        .flatMap(({ tRefs }) =>
          Effect.forEachPar(tRefs, (tRef) => tRef.get().commit()).map((chunk) =>
            chunk.toArray()
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(1, 101).toArray())
    })

    it("collects a chunk of transactional effects to a single transaction that produces a chunk of values", async () => {
      const program = Effect.Do()
        .bind("iterable", () =>
          Effect.succeed(List.range(1, 101).map((n) => TRef.make(n)))
        )
        .bind("tRefs", ({ iterable }) => STM.collectAll(Chunk.from(iterable)).commit())
        .flatMap(({ tRefs }) =>
          Effect.forEachPar(tRefs, (tRef) => tRef.get().commit()).map((chunk) =>
            chunk.toArray()
          )
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List.range(1, 101).toArray())
    })
  })

  describe("forEach", () => {
    it("performs an action on each list element and return a single transaction that contains the result", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .tap(({ tRef }) => STM.forEach(list, (n) => tRef.update((_) => _ + n)).commit())
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(list.reduce(0, (acc, n) => acc + n))
    })

    it("performs an action on each chunk element and return a single transaction that contains the result", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .tap(({ tRef }) =>
          STM.forEach(chunk, (n) => tRef.update((_) => _ + n)).commit()
        )
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(chunk.reduce(0, (acc, n) => acc + n))
    })
  })

  describe("forEachDiscard", () => {
    it("performs actions in order given a list", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(List.empty<number>()))
        .tap(({ tRef }) =>
          STM.forEach(list, (n) => tRef.update((list) => list.append(n))).commit()
        )
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })

    it("performs actions in order given a chunk", async () => {
      const chunk = Chunk(1, 2, 3, 4, 5)
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(List.empty<number>()))
        .tap(({ tRef }) =>
          STM.forEach(chunk, (n) => tRef.update((list) => list.append(n))).commit()
        )
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual(chunk.toArray())
    })
  })

  describe("Failure must", () => {
    it("rollback full transaction", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bind("either", ({ tRef }) =>
          (tRef.update((n) => n + 10) > STM.fail("error")).commit().either()
        )
        .bind("value", ({ tRef }) => tRef.get().commit())

      const { either, value } = await program.unsafeRunPromise()

      expect(either).toEqual(Either.left("error"))
      expect(value).toBe(0)
    })

    it("be ignored", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bind("either", ({ tRef }) =>
          (tRef.update((n) => n + 10) > STM.fail("error")).commit().ignore()
        )
        .bind("value", ({ tRef }) => tRef.get().commit())

      const { either, value } = await program.unsafeRunPromise()

      expect(either).toBeUndefined()
      expect(value).toBe(0)
    })
  })

  describe("commitEither", () => {
    it("commits this transaction whether it is a success or a failure", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(false))
        .bind("either", ({ tRef }) =>
          (tRef.set(true) > STM.fail("error")).commitEither().flip()
        )
        .bind("value", ({ tRef }) => tRef.get().commit())

      const { either, value } = await program.unsafeRunPromise()

      expect(either).toBe("error")
      expect(value).toBe(true)
    })
  })

  describe("orElse", () => {
    it("tries alternative once left retries", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.update((n) => n + 100) > STM.retry)
        .bindValue("right", ({ tRef }) => tRef.update((n) => n + 200))
        .tap(({ left, right }) => (left | right).commit())
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(200)
    })

    it("tries alternative once left fails", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) => tRef.update((n) => n + 100) > STM.fail("boom"))
        .bindValue("right", ({ tRef }) => tRef.update((n) => n + 200))
        .tap(({ left, right }) => (left | right).commit())
        .flatMap(({ tRef }) => tRef.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(200)
    })

    it("fail if alternative fails", async () => {
      const program = (STM.fail("left") | STM.fail("right")).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("right"))
    })
  })

  describe("orElseEither", () => {
    it("returns result of the first successful transaction wrapped in either", async () => {
      const program = Effect.struct({
        rightValue: STM.retry.orElseEither(STM.succeed(42)).commit(),
        leftValue1: STM.succeed(1).orElseEither(STM.succeed("nope")).commit(),
        leftValue2: STM.succeed(2).orElseEither(STM.retry).commit()
      })

      const { leftValue1, leftValue2, rightValue } = await program.unsafeRunPromise()

      expect(rightValue).toEqual(Either.right(42))
      expect(leftValue1).toEqual(Either.left(1))
      expect(leftValue2).toEqual(Either.left(2))
    })
  })

  describe("orElseFail", () => {
    it("tries left first", async () => {
      const program = STM.succeed(true).orElseFail(false).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("fails with the specified error once left retries", async () => {
      const program = STM.retry.orElseFail(false).either().commit()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(false))
    })

    it("fails with the specified error once left fails", async () => {
      const program = STM.fail(true).orElseFail(false).either().commit()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Either.left(false))
    })
  })

  describe("orElseSucceed", () => {
    it("tries left first", async () => {
      const program = STM.succeed(true).orElseSucceed(false).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("succeeds with the specified value if left retries", async () => {
      const program = STM.retry.orElseSucceed(false).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("succeeds with the specified value if left fails", async () => {
      const program = STM.fail(true).orElseSucceed(false).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })
  })

  describe("alternative", () => {
    it("succeeds if left succeeds", async () => {
      const program = STM.succeed("left").orTry(STM.succeed("right")).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("left")
    })

    it("succeeds if right succeeds", async () => {
      const program = STM.retry.orTry(STM.succeed("right")).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe("right")
    })

    it("retries left after right retries", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bindValue("left", ({ tRef }) =>
          tRef.get().flatMap((n) => STM.check(n > 500).as("left"))
        )
        .bindValue("right", () => STM.retry)
        .bindValue("updater", ({ tRef }) =>
          tRef
            .update((n) => n + 10)
            .commit()
            .forever()
        )
        .flatMap(({ left, right, updater }) => left.orTry(right).commit().race(updater))

      const result = await program.unsafeRunPromise()

      expect(result).toBe("left")
    })

    it("fails if left fails", async () => {
      const program = STM.fail("left").orTry(STM.succeed("right")).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("left"))
    })

    it("fails if right fails", async () => {
      const program = STM.retry.orTry(STM.fail("right")).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("right"))
    })
  })

  describe("mergeAll", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42
      const nonZero = 43
      const program = STM.mergeAll(
        List.empty<STM<unknown, never, number>>(),
        zeroElement,
        () => nonZero
      ).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(zeroElement)
    })

    it("merge list using function", async () => {
      const program = STM.mergeAll(
        List(3, 5, 7).map(STM.succeedNow),
        1,
        (a, b) => a + b
      ).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1 + 3 + 5 + 7)
    })

    it("return error if it exists in list", async () => {
      const program = STM.mergeAll(
        List<STM<unknown, any, any>>(STM.unit, STM.fail(1)),
        undefined,
        constVoid
      ).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })
  })

  describe("reduceAll", () => {
    it("should reduce all elements to a single value", async () => {
      const program = STM.reduceAll(
        STM.succeed(1),
        List(2, 3, 4).map(STM.succeedNow),
        (acc, a) => acc + a
      ).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("should handle an empty iterable", async () => {
      const program = STM.reduceAll(
        STM.succeed(1),
        List.empty<STM<unknown, never, number>>(),
        (acc, a) => acc + a
      ).commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  describe("validate", () => {
    it("returns all errors if never valid", async () => {
      const input = List.repeat(0, 10)
      const program = STM.validate(input, STM.failNow).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(input.toArray()))
    })

    it("accumulate errors and ignore successes", async () => {
      const input = List.range(0, 10)
      const program = STM.validate(input, (n) =>
        n % 2 === 0 ? STM.succeed(n) : STM.fail(n)
      ).commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail([1, 3, 5, 7, 9]))
    })

    it("accumulate successes", async () => {
      const input = List.range(0, 10)
      const program = STM.validate(input, STM.succeedNow)
        .commit()
        .map((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(input.toArray())
    })
  })

  describe("validateFirst", () => {
    it("returns all errors if never valid", async () => {
      const input = List.repeat(0, 10)
      const program = STM.validateFirst(input, STM.failNow)
        .commit()
        .mapError((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(input.toArray()))
    })

    it("runs sequentially and short circuits on first success validation", async () => {
      const input = List.range(1, 10)
      const program = STM.Do()
        .bind("counter", () => TRef.make(0))
        .bind("result", ({ counter }) =>
          STM.validateFirst(
            input,
            (n) =>
              counter.update((_) => _ + 1) > (n === 6 ? STM.succeed(n) : STM.fail(n))
          )
        )
        .bind("count", ({ counter }) => counter.get())
        .commit()

      const { count, result } = await program.unsafeRunPromise()

      expect(result).toBe(6)
      expect(count).toBe(6)
    })

    it("returns errors in correct order", async () => {
      const input = List(2, 4, 6, 3, 5, 6)
      const program = STM.validateFirst(input, STM.failNow)
        .commit()
        .mapError((chunk) => chunk.toArray())

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(input.toArray()))
    })
  })

  describe("when combinators", () => {
    it("when true", async () => {
      const program = TRef.make(false)
        .commit()
        .flatMap((tRef) => (STM.when(true, tRef.set(true)) > tRef.get()).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("when false", async () => {
      const program = TRef.make(false)
        .commit()
        .flatMap((tRef) => (STM.when(false, tRef.set(true)) > tRef.get()).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("whenSTM true", async () => {
      const program = TRef.make(0)
        .commit()
        .flatMap((tRef) =>
          (
            STM.whenSTM(
              tRef.get().map((n) => n === 0),
              tRef.update((n) => n + 1)
            ) > tRef.get()
          ).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("whenSTM false", async () => {
      const program = TRef.make(0)
        .commit()
        .flatMap((tRef) =>
          (
            STM.whenSTM(
              tRef.get().map((n) => n !== 0),
              tRef.update((n) => n + 1)
            ) > tRef.get()
          ).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("whenCase executes correct branch only", async () => {
      const program = STM.Do()
        .bind("tRef", () => TRef.make(false))
        .tap(({ tRef }) =>
          STM.whenCase(Option.emptyOf<number>(), (option) =>
            option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result1", ({ tRef }) => tRef.get())
        .tap(({ tRef }) =>
          STM.whenCase(Option.some(0), (option) =>
            option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result2", ({ tRef }) => tRef.get())
        .commit()

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe(false)
      expect(result2).toBe(true)
    })

    it("whenCaseSTM executes condition effect and correct branch", async () => {
      const program = STM.Do()
        .bind("tRef", () => TRef.make(false))
        .tap(({ tRef }) =>
          STM.whenCaseSTM(STM.succeed(Option.emptyOf<number>()), (option) =>
            option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result1", ({ tRef }) => tRef.get())
        .tap(({ tRef }) =>
          STM.whenCaseSTM(STM.succeed(Option.some(0)), (option) =>
            option._tag === "Some" ? Option.some(tRef.set(true)) : Option.none
          )
        )
        .bind("result2", ({ tRef }) => tRef.get())
        .commit()

      const { result1, result2 } = await program.unsafeRunPromise()

      expect(result1).toBe(false)
      expect(result2).toBe(true)
    })
  })

  describe("regression tests", () => {
    it("read only STM shouldn't return partial state of concurrent read-write STM", async () => {
      const program = Effect.Do()
        .bind("tRef1", () => TRef.makeCommit(0))
        .bind("tRef2", () => TRef.makeCommit(0))
        .bind("sumFiber", ({ tRef1, tRef2 }) =>
          tRef1
            .get()
            .flatMap((n1) => tRef2.get().map((n2) => n1 + n2))
            .commit()
            .fork()
        )
        .tap(({ tRef1, tRef2 }) =>
          (tRef1.update((n) => n + 1) > tRef2.update((n) => n + 1)).commit()
        )
        .flatMap(({ sumFiber }) => sumFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result === 0 || result === 2).toBe(true)
    })
  })

  describe("STM stack safety", () => {
    it("long alternative chains", async () => {
      const program = TRef.make(0)
        .tap((tRef) =>
          STM.loopDiscard(
            10000,
            (n) => n > 0,
            (n) => n - 1
          )(() => STM.retry.orTry(tRef.getAndUpdate((n) => n + 1)))
        )
        .flatMap((tRef) => tRef.get())
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10000)
    })

    it("long map chains", async () => {
      const program = chain(10000, (stm) => stm.map((n) => n + 1))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    test("long collect chains", async () => {
      const program = chain(10000, (stm) =>
        stm.continueOrRetry((n) => Option.some(n + 1))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long collectSTM chains", async () => {
      const program = chain(10000, (stm) =>
        stm.continueOrRetrySTM((n) => Option.some(STM.succeed(n + 1)))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long flatMap chains", async () => {
      const program = chain(10000, (stm) => stm.flatMap((n) => STM.succeed(n + 1)))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long fold chains", async () => {
      const program = chain(10000, (stm) =>
        stm.fold(
          () => 0,
          (n) => n + 1
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long foldSTM chains", async () => {
      const program = chain(10000, (stm) =>
        stm.foldSTM(
          () => STM.succeed(0),
          (n) => STM.succeed(n + 1)
        )
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(10000)
    })

    it("long mapError chains", async () => {
      function chainError(depth: number): IO<number, never> {
        return chainErrorLoop(depth, STM.fail(0))
      }

      function chainErrorLoop(
        n: number,
        acc: STM<unknown, number, never>
      ): IO<number, never> {
        return n <= 0
          ? acc.commit()
          : Effect.suspendSucceed(
              chainErrorLoop(
                n - 1,
                acc.mapError((n) => n + 1)
              )
            )
      }

      const program = chainError(10000)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(10000))
    })

    it("long orElse chains", async () => {
      const program = TRef.make(0)
        .tap((tRef) =>
          STM.loopDiscard(
            10000,
            (n) => n > 0,
            (n) => n - 1
          )(() => STM.retry | tRef.getAndUpdate((n) => n + 1))
        )
        .flatMap((tRef) => tRef.get())
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10000)
    })

    it("long provide chains", async () => {
      const program = chain(10000, (stm) => stm.provideEnvironment(0))

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(0)
    })
  })

  describe("STM environment", () => {
    it("access environment and provide it outside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(HasSTMEnv)((_) => _.ref.update((n) => n + 1))
            .commit()
            .provideEnvironment(HasSTMEnv.has(env))
        )
        .flatMap((env) => env.ref.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("access environment and provide it inside transaction", async () => {
      const program = STMEnv.make(0)
        .tap((env) =>
          STM.serviceWithSTM(HasSTMEnv)((_) => _.ref.update((n) => n + 1))
            .provideEnvironment(HasSTMEnv.has(env))
            .commit()
        )
        .flatMap((env) => env.ref.get().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })
  })

  // TODO: implement after TQueue
  it.skip("STM collectAll ordering", async () => {
    // val tx = for {
    //   tq  <- TQueue.bounded[Int](3)
    //   _   <- tq.offer(1)
    //   _   <- tq.offer(2)
    //   _   <- tq.offer(3)
    //   ans <- ZSTM.collectAll(List(tq.take, tq.take, tq.take))
    // } yield ans
    // assertM(tx.commit)(equalTo(List(1, 2, 3)))
  })

  describe("taps", () => {
    it("tap should apply the transactional function to the effect result while keeping the effect itself", async () => {
      const program = STM.Do()
        .bind("refA", () => TRef.make(10))
        .bind("refB", () => TRef.make(0))
        .bind("a", ({ refA, refB }) => refA.get().tap((n) => refB.set(n + 1)))
        .bind("b", ({ refB }) => refB.get())
        .commit()

      const { a, b } = await program.unsafeRunPromise()

      expect(a).toBe(10)
      expect(b).toBe(11)
    })

    // TODO: implement after TPromise
    it("tapBoth applies the success function to success values while keeping the effect intact", async () => {
      // val tx =
      //   for {
      //     tapSuccess    <- TPromise.make[Nothing, Int]
      //     tapError      <- TPromise.make[Nothing, String]
      //     succeededSTM   = ZSTM.succeed(42): STM[String, Int]
      //     result        <- succeededSTM.tapBoth(e => tapError.succeed(e), a => tapSuccess.succeed(a))
      //     tappedSuccess <- tapSuccess.await
      //   } yield (result, tappedSuccess)
      // assertM(tx.commit)(equalTo((42, 42)))
    })

    // TODO: implement after TPromise
    it("tapBoth applies the function to error and successful values while keeping the effect itself on error", async () => {
      // val tx =
      //   for {
      //     tapSuccess  <- TPromise.make[Nothing, Int]
      //     tapError    <- TPromise.make[Nothing, String]
      //     succeededSTM = ZSTM.fail("error"): STM[String, Int]
      //     result      <- succeededSTM.tapBoth(e => tapError.succeed(e), a => tapSuccess.succeed(a)).either
      //     tappedError <- tapError.await
      //   } yield (result, tappedError)
      // assertM(tx.commit)(equalTo((Left("error"), "error")))
    })

    // TODO: implement after TPromise
    it("tapError should apply the transactional function to the error result while keeping the effect itself", async () => {
      // val tx =
      //   for {
      //     errorRef    <- TPromise.make[Nothing, String]
      //     failedStm    = ZSTM.fail("error") *> ZSTM.succeed(0)
      //     result      <- failedStm.tapError(e => errorRef.succeed(e)).either
      //     tappedError <- errorRef.await
      //   } yield (result, tappedError)
      // assertM(tx.commit)(equalTo((Left("error"), "error")))
    })
  })
})

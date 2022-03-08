import { List } from "../../src/collection/immutable/List"
import { constFalse, constTrue, identity } from "../../src/data/Function"
import { ArrayIndexOutOfBoundsException } from "../../src/data/GlobalExceptions"
import { Option } from "../../src/data/Option"
import { Effect } from "../../src/io/Effect"
import { Exit } from "../../src/io/Exit"
import * as Equal from "../../src/prelude/Equal"
import * as Ord from "../../src/prelude/Ord"
import { STM } from "../../src/stm/STM"
import { TArray } from "../../src/stm/TArray"
import { TRef } from "../../src/stm/TRef"

const n = 10
const N = 1000
const largePrime = 223
const boom = new Error("boom")

function makeTArray<A>(n: number, a: A): STM<unknown, never, TArray<A>> {
  return TArray.fromIterable(List.repeat(a, n))
}

function makeStair(n: number): STM<unknown, never, TArray<number>> {
  return TArray.fromIterable(List.range(1, n + 1))
}

function makeStairWithHoles(n: number): STM<unknown, never, TArray<Option<number>>> {
  return TArray.fromIterable(
    List.range(1, n + 1).map((i) =>
      i % 3 === 0 ? Option.emptyOf<number>() : Option.some(i)
    )
  )
}

function makeRepeats(
  blocks: number,
  length: number
): STM<unknown, never, TArray<number>> {
  return TArray.fromIterable(
    List.range(0, blocks * length).map((i) => (i % length) + 1)
  )
}

function valuesOf<A>(tArray: TArray<A>): STM<unknown, never, List<A>> {
  return tArray.reduce(List.empty<A>(), (acc, a) => acc.append(a))
}

describe("TArray", () => {
  describe("index", () => {
    it("valid index", async () => {
      const program = makeTArray(1, 42)
        .flatMap((array) => array[0])
        .commit()

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(42)
    })

    it("dies with ArrayIndexOutOfBounds when index is out of bounds", async () => {
      const program = makeTArray(1, 42)
        .flatMap((array) => array[-1])
        .commit()

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(
        Exit.die(new ArrayIndexOutOfBoundsException(-1))
      )
    })
  })

  describe("collectFirst", () => {
    it("finds and transforms correctly", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirst((option) =>
              option.isSome() && option.value > 2
                ? Option.some(option.value.toString())
                : Option.none
            )
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some("4"))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, Option.emptyOf<number>())
        .commit()
        .flatMap((tArray) =>
          tArray.collectFirst((option) => Option.some(option)).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("fails to find absent", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirst((option) =>
              option.isSome() && option.value > n
                ? Option.some(option.value.toString())
                : Option.none
            )
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStairWithHoles(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .collectFirst((option) =>
              option.isSome() && option.value % largePrime === 0
                ? Option.some(option.value.toString())
                : Option.none
            )
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) =>
            tArray.update(i, () => Option.some(1))
          ).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(largePrime.toString()))
    })
  })

  describe("collectFirstSTM", () => {
    it("finds and transforms correctly", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value > 2
                ? Option.some(STM.succeed(option.value.toString()))
                : Option.none
            )
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some("4"))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, Option.emptyOf<number>())
        .commit()
        .flatMap((tArray) =>
          tArray.collectFirstSTM((option) => Option.some(STM.succeed(option))).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("fails to find absent", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value > n
                ? Option.some(STM.succeed(option.value.toString()))
                : Option.none
            )
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStairWithHoles(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value % largePrime === 0
                ? Option.some(STM.succeed(option.value.toString()))
                : Option.none
            )
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) =>
            tArray.update(i, () => Option.some(1))
          ).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(largePrime.toString()))
    })

    it("fails on errors before result found", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.fold(Option.some(STM.fail(boom)), (i) =>
                i > 2 ? Option.some(STM.succeed(i.toString)) : Option.none
              )
            )
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })

    it("succeeds on errors after result found", async () => {
      const program = makeStairWithHoles(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .collectFirstSTM((option) =>
              option.isSome() && option.value > 2
                ? Option.some(STM.succeed(option.value.toString()))
                : option.isSome() && option.value === 7
                ? Option.some(STM.fail(boom))
                : Option.none
            )
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some("4"))
    })
  })

  describe("contains", () => {
    it("true when in the array", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.contains(Equal.number)(3).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("false when not in the array", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .contains(Equal.number)(n + 1)
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("false for empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.contains(Equal.number)(0).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })
  })

  describe("count", () => {
    it("computes correct sum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.count((n) => n % 2 === 0).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })

    it("zero for absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.count((_) => _ > n).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("zero for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.count(constTrue).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })
  })

  describe("countSTM", () => {
    it("computes correct sum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.countSTM((n) => STM.succeed(n % 2 === 0)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })

    it("zero for absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.countSTM((_) => STM.succeed(_ > n)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })

    it("zero for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.countSTM(() => STM.succeed(constTrue)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(0)
    })
  })

  describe("exists", () => {
    it("detects satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.exists((n) => n % 2 === 0).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("detects lack of satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.exists((n) => n % 11 === 0).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("false for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.exists(constTrue).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })
  })

  describe("existsSTM", () => {
    it("detects satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.existsSTM((n) => STM.succeed(n % 2 === 0)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("detects lack of satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray.existsSTM((n) => STM.succeed(n % 11 === 0)).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("false for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.existsSTM(() => STM.succeed(constTrue)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("fails for errors before witness", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .existsSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n === 5)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })

    it("fails for errors after witness", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .existsSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n === 5)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })
  })

  describe("find", () => {
    it("finds correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.find((n) => n % 5 === 0).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(5))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, 0)
        .commit()
        .flatMap((tArray) => tArray.find(constTrue).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("fails to find absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.find((_) => _ > n).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .find((n) => n % largePrime === 0)
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, () => 1)).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(largePrime))
    })
  })

  describe("findSTM", () => {
    it("finds correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findSTM((n) => STM.succeed(n % 5 === 0)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(5))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, 0)
        .commit()
        .flatMap((tArray) => tArray.findSTM(() => STM.succeed(constTrue)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("fails to find absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findSTM((_) => STM.succeed(_ > n)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .findSTM((n) => STM.succeed(n % largePrime === 0))
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, () => 1)).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(largePrime))
    })

    it("fails on errors before result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .findSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })

    it("succeeds on errors after result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .findSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(5))
    })
  })

  describe("findLast", () => {
    it("finds correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findLast((n) => n % 5 === 0).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(10))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, 0)
        .commit()
        .flatMap((tArray) => tArray.findLast(constTrue).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("fails to find absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findLast((_) => _ > n).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .findLast((n) => n % largePrime === 0)
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, () => 1)).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(largePrime * 4))
    })
  })

  describe("findLastSTM", () => {
    it("finds correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray.findLastSTM((n) => STM.succeed(n % 5 === 0)).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(10))
    })

    it("succeeds for empty", async () => {
      const program = makeTArray(0, 0)
        .commit()
        .flatMap((tArray) => tArray.findLastSTM(() => STM.succeed(constTrue)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("fails to find absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.findLastSTM((_) => STM.succeed(_ > n)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .findLastSTM((n) => STM.succeed(n % largePrime === 0))
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, () => 1)).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(largePrime * 4))
    })

    it("succeeds on errors before result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .findLastSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n % 7 === 0)))
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(7))
    })

    it("fails on errors after result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .findLastSTM((n) => (n === 8 ? STM.fail(boom) : STM.succeed(n % 7 === 0)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })
  })

  describe("firstOption", () => {
    it("retrieves the first item", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.firstOption.commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(1))
    })

    it("is none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.firstOption.commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("reduce", () => {
    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, 0).commit())
        .bind("sum1Fiber", ({ tArray }) =>
          tArray
            .reduce(0, (acc, n) => acc + n)
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, (n) => n + 1)).commit()
        )
        .flatMap(({ sum1Fiber }) => sum1Fiber.join())

      const result = await program.unsafeRunPromise()

      expect(result === 0 || result === N).toBe(true)
    })
  })

  describe("reduceSTM", () => {
    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, 0).commit())
        .bind("sum1Fiber", ({ tArray }) =>
          tArray
            .reduceSTM(0, (acc, n) => STM.succeed(acc + n))
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, (n) => n + 1)).commit()
        )
        .flatMap(({ sum1Fiber }) => sum1Fiber.join())

      const result = await program.unsafeRunPromise()

      expect(result === 0 || result === N).toBe(true)
    })

    it("returns effect failure", async () => {
      function failInTheMiddle(acc: number, n: number): STM<unknown, Error, number> {
        return acc === N / 2 ? STM.fail(boom) : STM.succeed(acc + n)
      }

      const program = makeTArray(N, 1)
        .commit()
        .flatMap((tArray) => tArray.reduceSTM(0, failInTheMiddle).commit().flip())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })
  })

  describe("forAll", () => {
    it("detects satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.forAll((_) => _ < n + 1).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("detects lack of satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.forAll((_) => _ < n - 1).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("true for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.forAll(constFalse).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })
  })

  describe("forAllSTM", () => {
    it("detects satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.forAllSTM((_) => STM.succeed(_ < n + 1)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("detects lack of satisfaction", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.forAllSTM((_) => STM.succeed(_ < n - 1)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(false)
    })

    it("true for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.forAllSTM((_) => STM.succeed(constFalse)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(true)
    })

    it("fails for errors before counterexample", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .forAllSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n !== 5)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })

    it("fails for errors after counterexample", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .forAllSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n === 5)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })
  })

  describe("forEach", () => {
    it("side-effect is transactional", async () => {
      const program = Effect.Do()
        .bind("tRef", () => TRef.makeCommit(0))
        .bind("tArray", () => makeTArray(n, 1).commit())
        .bind("fiber", ({ tArray, tRef }) =>
          tArray
            .forEach((i) => tRef.update((j) => i + j).asUnit())
            .commit()
            .fork()
        )
        .bind("value", ({ tRef }) => tRef.get().commit())
        .tap(({ fiber }) => fiber.join())
        .map(({ value }) => value)

      const result = await program.unsafeRunPromise()

      expect(result === 0 || result === n).toBe(true)
    })
  })

  describe("indexOf", () => {
    it("correct index if in array", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.indexOf(Equal.number)(2).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("-1 for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.indexOf(Equal.number)(1).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for absent", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.indexOf(Equal.number)(4).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })
  })

  describe("indexOfFrom", () => {
    it("correct index if in array, with offset", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.indexOfFrom(Equal.number)(2, 2).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(4)
    })

    it("-1 if absent after offset", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.indexOfFrom(Equal.number)(1, 7).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for negative offset", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.indexOfFrom(Equal.number)(2, -1).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for too high offset", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.indexOfFrom(Equal.number)(2, 9).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })
  })

  describe("indexWhere", () => {
    it("determines the correct index", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.indexWhere((n) => n % 5 === 0).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(4)
    })

    it("-1 for empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.indexWhere(constTrue).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.indexWhere((_) => _ > n).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .indexWhere((n) => n % largePrime === 0)
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, () => 1)).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result === largePrime - 1 || result === -1).toBe(true)
    })
  })

  describe("indexWhereSTM", () => {
    it("determines the correct index", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray.indexWhereSTM((n) => STM.succeed(n % 5 === 0)).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(4)
    })

    it("-1 for empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) =>
          tArray.indexWhereSTM(() => STM.succeed(constTrue)).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for absent", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.indexWhereSTM((_) => STM.succeed(_ > n)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .indexWhereSTM((n) => STM.succeed(n % largePrime === 0))
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, () => 1)).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result === largePrime - 1 || result === -1).toBe(true)
    })

    it("fails on errors before result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .indexWhereSTM((n) => (n === 4 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })

    it("succeeds on errors after result found", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .indexWhereSTM((n) => (n === 6 ? STM.fail(boom) : STM.succeed(n % 5 === 0)))
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(4)
    })
  })

  describe("indexWhereFrom", () => {
    it("correct index if in array, with offset", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.indexWhereFrom((n) => n % 2 === 0, 5).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })

    it("-1 if absent after offset", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.indexWhereFrom((n) => n % 7 === 0, 7).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for negative offset", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.indexWhereFrom(constTrue, -1).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for too high offset", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.indexWhereFrom(constTrue, n + 1).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })
  })

  describe("indexWhereFromSTM", () => {
    it("correct index if in array, with offset", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray.indexWhereFromSTM((n) => STM.succeed(n % 2 === 0), 5).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(5)
    })

    it("-1 if absent after offset", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray.indexWhereFromSTM((n) => STM.succeed(n % 7 === 0), 7).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for negative offset", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray.indexWhereFromSTM(() => STM.succeed(constTrue), -1).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for too high offset", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray.indexWhereFromSTM(() => STM.succeed(constTrue), n + 1).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("succeeds when error excluded by offset", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .indexWhereFromSTM(
              (n) => (n === 1 ? STM.fail(boom) : STM.succeed(n % 5 === 0)),
              2
            )
            .commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(4)
    })
  })

  describe("lastIndexOf", () => {
    it("correct index if in array", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOf(Equal.number)(2).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(7)
    })

    it("-1 for empty", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.lastIndexOf(Equal.number)(1).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for absent", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOf(Equal.number)(4).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })
  })

  describe("lastIndexOfFrom", () => {
    it("correct index if in array, with limit", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOfFrom(Equal.number)(2, 6).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(4)
    })

    it("-1 if absent before limit", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOfFrom(Equal.number)(3, 1).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for negative offset", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOfFrom(Equal.number)(2, -1).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })

    it("-1 for too high offset", async () => {
      const program = makeRepeats(3, 3)
        .commit()
        .flatMap((tArray) => tArray.lastIndexOfFrom(Equal.number)(2, 9).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toBe(-1)
    })
  })

  describe("lastOption", () => {
    it("retrieves the last entry", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.lastOption.commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(n))
    })

    it("is none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.lastOption.commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("transform", () => {
    it("updates values atomically", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, "a").commit())
        .bind("transformFiber", ({ tArray }) =>
          tArray
            .transform((a) => a + "+b")
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) =>
            tArray.update(i, (ab) => ab + "+c")
          ).commit()
        )
        .bind("first", ({ tArray }) => tArray[0].commit())
        .bind("last", ({ tArray }) => tArray[N - 1].commit())

      const { first, last } = await program.unsafeRunPromise()

      expect(first === "a+b+c" || first === "a+c+b").toBe(true)
      expect(last === "a+b+c" || last === "a+c+b").toBe(true)
    })
  })

  describe("transformSTM", () => {
    it("updates values atomically", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, "a").commit())
        .bind("transformFiber", ({ tArray }) =>
          tArray
            .transformSTM((a) => STM.succeed(a + "+b"))
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) =>
            tArray.update(i, (ab) => ab + "+c")
          ).commit()
        )
        .bind("first", ({ tArray }) => tArray[0].commit())
        .bind("last", ({ tArray }) => tArray[N - 1].commit())

      const { first, last } = await program.unsafeRunPromise()

      expect(first === "a+b+c" || first === "a+c+b").toBe(true)
      expect(last === "a+b+c" || last === "a+c+b").toBe(true)
    })

    it("updates all or nothing", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeTArray(N, 0).commit())
        .tap(({ tArray }) => tArray.update(N / 2, () => 1).commit())
        .bind("result", ({ tArray }) =>
          tArray
            .transformSTM((a) => (a === 0 ? STM.succeed(42) : STM.fail(boom)))
            .commit()
            .flip()
        )
        .bind("first", ({ tArray }) => tArray[0].commit())

      const { first, result } = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
      expect(first).toBe(0)
    })
  })

  describe("update", () => {
    it("happy-path", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) => (tArray.update(0, (n) => -n) > valuesOf(tArray)).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List(-42))
    })

    it("dies with ArrayIndexOutOfBounds when index is out of bounds", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) => tArray.update(-1, identity).commit())

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(
        Exit.die(new ArrayIndexOutOfBoundsException(-1))
      )
    })
  })

  describe("updateSTM", () => {
    test("happy-path", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) =>
          (tArray.updateSTM(0, (n) => STM.succeed(-n)) > valuesOf(tArray)).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List(-42))
    })

    it("dies with ArrayIndexOutOfBounds when index is out of bounds", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) => tArray.updateSTM(-1, STM.succeedNow).commit())

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(
        Exit.die(new ArrayIndexOutOfBoundsException(-1))
      )
    })

    it("failure", async () => {
      const program = makeTArray(1, 42)
        .commit()
        .flatMap((tArray) =>
          tArray
            .updateSTM(0, () => STM.fail(boom))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })
  })

  describe("maxOption", () => {
    it("computes correct maximum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.maxOption(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(n))
    })

    it("returns none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.maxOption(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("minOption", () => {
    it("computes correct minimum", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.minOption(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(1))
    })

    it("returns none for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.maxOption(Ord.number).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })
  })

  describe("reduceOption", () => {
    it("reduces correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) => tArray.reduceOption((a, b) => a + b).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some((n * (n + 1)) / 2))
    })

    it("returns single entry", async () => {
      const program = makeTArray(1, 1)
        .commit()
        .flatMap((tArray) => tArray.reduceOption((a, b) => a + b).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(1))
    })

    it("returns None for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) => tArray.reduceOption((a, b) => a + b).commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .reduceOption((a, b) => a + b)
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, () => 1)).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result.value === (N * (N + 1)) / 2 || result.value === N).toBe(true)
    })
  })

  describe("reduceOptionSTM", () => {
    it("reduces correctly", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray.reduceOptionSTM((a, b) => STM.succeed(a + b)).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some((n * (n + 1)) / 2))
    })

    it("returns single entry", async () => {
      const program = makeTArray(1, 1)
        .commit()
        .flatMap((tArray) =>
          tArray.reduceOptionSTM((a, b) => STM.succeed(a + b)).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.some(1))
    })

    it("returns None for an empty array", async () => {
      const program = TArray.empty<number>()
        .commit()
        .flatMap((tArray) =>
          tArray.reduceOptionSTM((a, b) => STM.succeed(a + b)).commit()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(Option.none)
    })

    it("is atomic", async () => {
      const program = Effect.Do()
        .bind("tArray", () => makeStair(N).commit())
        .bind("findFiber", ({ tArray }) =>
          tArray
            .reduceOptionSTM((a, b) => STM.succeed(a + b))
            .commit()
            .fork()
        )
        .tap(({ tArray }) =>
          STM.forEach(List.range(0, N), (i) => tArray.update(i, () => 1)).commit()
        )
        .flatMap(({ findFiber }) => findFiber.join())

      const result = await program.unsafeRunPromise()

      expect(result.value === (N * (N + 1)) / 2 || result.value === N).toBe(true)
    })

    it("fails on errors", async () => {
      const program = makeStair(n)
        .commit()
        .flatMap((tArray) =>
          tArray
            .reduceOptionSTM((a, b) => (b === 4 ? STM.fail(boom) : STM.succeed(a + b)))
            .commit()
            .flip()
        )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(boom)
    })
  })

  describe("toArray", () => {
    it("should convert to an array", async () => {
      const program = TArray(1, 2, 3, 4)
        .commit()
        .flatMap((tArray) => tArray.toArray().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual([1, 2, 3, 4])
    })
  })

  describe("toChunk", () => {
    it("should convert to a chunk", async () => {
      const program = TArray(1, 2, 3, 4)
        .commit()
        .flatMap((tArray) => tArray.toChunk().commit())

      const result = await program.unsafeRunPromise()

      expect(result.toArray()).toEqual([1, 2, 3, 4])
    })
  })

  describe("toList", () => {
    it("should convert to a list", async () => {
      const program = TArray(1, 2, 3, 4)
        .commit()
        .flatMap((tArray) => tArray.toList().commit())

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(List(1, 2, 3, 4))
    })
  })

  describe("size", () => {
    it("should get the size of the array", async () => {
      const program = makeStair(n)
        .commit()
        .map((tArray) => tArray.size)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })
  })
})

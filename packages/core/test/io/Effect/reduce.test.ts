import { List } from "../../../src/collection/immutable/List"
import { constVoid } from "../../../src/data/Function"
import type { IO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"

describe("Effect", () => {
  describe("reduce", () => {
    it("with a successful step function sums the list properly", async () => {
      const program = Effect.reduce(List(1, 2, 3, 4, 5), 0, (acc, curr) =>
        Effect.succeed(acc + curr)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(15)
    })

    it("with a failing step function returns a failed IO", async () => {
      const program = Effect.reduce(List(1, 2, 3, 4, 5), 0, () => Effect.fail("fail"))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("fail"))
    })

    it("run sequentially from left to right", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.reduce(list, List.empty<number>(), (acc, curr) =>
        Effect.succeed(acc.prepend(curr))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list.reverse())
    })
  })

  describe("reduceRight", () => {
    it("with a successful step function sums the list properly", async () => {
      const program = Effect.reduceRight(List(1, 2, 3, 4, 5), 0, (acc, curr) =>
        Effect.succeed(acc + curr)
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(15)
    })

    it("with a failing step function returns a failed IO", async () => {
      const program = Effect.reduce(List(1, 2, 3, 4, 5), 0, () => Effect.fail("fail"))

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail("fail"))
    })

    it("run sequentially from right to left", async () => {
      const list = List(1, 2, 3, 4, 5)
      const program = Effect.reduceRight(list, List.empty<number>(), (curr, acc) =>
        Effect.succeed(acc.prepend(curr))
      )

      const result = await program.unsafeRunPromise()

      expect(result).toEqual(list)
    })
  })

  describe("reduceAllPar", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42
      const nonZero = 43
      const program = Effect.reduceAllPar(
        Effect.succeed(zeroElement),
        List.empty(),
        () => nonZero
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(zeroElement)
    })

    it("reduce list using function", async () => {
      const zeroElement = Effect.succeed(1)
      const otherEffects = List(3, 5, 7).map(Effect.succeedNow)
      const program = Effect.reduceAllPar(
        zeroElement,
        otherEffects,
        (acc, a) => acc + a
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1 + 3 + 5 + 7)
    })

    it("return error if zero is an error", async () => {
      const zeroElement = Effect.fail(1)
      const otherEffects = List(Effect.unit, Effect.unit)
      const program = Effect.reduceAllPar(zeroElement, otherEffects, constVoid)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })

    it("return error if it exists in list", async () => {
      const zeroElement = Effect.unit
      const effects = List<IO<number, void>>(Effect.unit, Effect.fail(1))
      const program = Effect.reduceAllPar(zeroElement, effects, constVoid)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })
  })
})

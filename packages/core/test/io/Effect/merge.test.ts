import { List } from "../../../src/collection/immutable/List"
import { constVoid } from "../../../src/data/Function"
import type { IO, UIO } from "../../../src/io/Effect"
import { Effect } from "../../../src/io/Effect"
import { Exit } from "../../../src/io/Exit"

describe("Effect", () => {
  describe("merge", () => {
    it("on flipped result", async () => {
      const effect: IO<number, number> = Effect.succeed(1)
      const program = Effect.struct({
        a: effect.merge(),
        b: effect.flip().merge()
      })

      const { a, b } = await program.unsafeRunPromise()

      expect(a).toBe(b)
    })
  })

  describe("mergeAll", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42
      const nonZero = 43
      const program = Effect.mergeAll(
        List.empty<UIO<unknown>>(),
        zeroElement,
        () => nonZero
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(zeroElement)
    })

    it("merge list using function", async () => {
      const effects = List(3, 5, 7).map(Effect.succeedNow)
      const program = Effect.mergeAll(effects, 1, (b, a) => b + a)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1 + 3 + 5 + 7)
    })

    it("return error if it exists in list", async () => {
      const effects = List<IO<number, void>>(Effect.unit, Effect.fail(1))
      const program = Effect.mergeAll(effects, undefined, constVoid)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })
  })

  describe("mergeAllPar", () => {
    it("return zero element on empty input", async () => {
      const zeroElement = 42
      const nonZero = 43
      const program = Effect.mergeAllPar(
        List.empty<UIO<unknown>>(),
        zeroElement,
        () => nonZero
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(zeroElement)
    })

    it("merge list using function", async () => {
      const effects = List(3, 5, 7).map(Effect.succeedNow)
      const program = Effect.mergeAllPar(effects, 1, (b, a) => b + a)

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1 + 3 + 5 + 7)
    })

    it("return error if it exists in list", async () => {
      const effects = List<IO<number, void>>(Effect.unit, Effect.fail(1))
      const program = Effect.mergeAllPar(effects, undefined, constVoid)

      const result = await program.unsafeRunPromiseExit()

      expect(result.untraced()).toEqual(Exit.fail(1))
    })
  })
})

import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("reduce", () => {
    it("with a successful step function sums the list properly", () =>
      Do(($) => {
        const result = $(Effect.reduce(
          List(1, 2, 3, 4, 5),
          0 as number,
          (acc, curr) => Effect.sync(acc + curr)
        ))
        assert.strictEqual(result, 15)
      }).unsafeRunPromise())

    it("with a failing step function returns a failed IO", () =>
      Do(($) => {
        const result = $(Effect.reduce(List(1, 2, 3, 4, 5), 0, () => Effect.failSync("fail")).exit)
        assert.isTrue(result == Exit.fail("fail"))
      }).unsafeRunPromiseExit())

    it("run sequentially from left to right", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5)
        const result = $(Effect.reduce(
          list,
          List.empty<number>(),
          (acc: List<number>, curr) => Effect.sync(acc.prepend(curr))
        ))
        assert.isTrue(result == list.reverse)
      }).unsafeRunPromise())
  })

  describe.concurrent("reduceRight", () => {
    it("with a successful step function sums the list properly", () =>
      Do(($) => {
        const result = $(Effect.reduceRight(
          List(1, 2, 3, 4, 5),
          0 as number,
          (acc, curr) => Effect.sync(acc + curr)
        ))
        assert.strictEqual(result, 15)
      }).unsafeRunPromise())

    it("with a failing step function returns a failed IO", () =>
      Do(($) => {
        const result = $(Effect.reduce(List(1, 2, 3, 4, 5), 0, () => Effect.failSync("fail")).exit)
        assert.isTrue(result == Exit.fail("fail"))
      }).unsafeRunPromiseExit())

    it("run sequentially from right to left", () =>
      Do(($) => {
        const list = List(1, 2, 3, 4, 5)
        const result = $(Effect.reduceRight(
          list,
          List.empty<number>(),
          (curr, acc: List<number>) => Effect.sync(acc.prepend(curr))
        ))
        assert.isTrue(result == list)
      }).unsafeRunPromise())
  })

  describe.concurrent("reduceAllPar", () => {
    it("return zero element on empty input", () =>
      Do(($) => {
        const zeroElement = 42
        const nonZero = 43
        const result = $(Effect.reduceAllPar(
          Effect.sync(zeroElement),
          List.empty<Effect.UIO<number>>(),
          () => nonZero
        ))
        assert.strictEqual(result, zeroElement)
      }).unsafeRunPromise())

    it("reduce list using function", () =>
      Do(($) => {
        const zeroElement = Effect.sync(1)
        const otherEffects = List(3, 5, 7).map(Effect.succeed)
        const result = $(Effect.reduceAllPar(
          zeroElement,
          otherEffects,
          (acc, a) => acc + a
        ))
        assert.strictEqual(result, 1 + 3 + 5 + 7)
      }).unsafeRunPromise())

    it("return error if zero is an error", () =>
      Do(($) => {
        const zeroElement = Effect.failSync(1)
        const otherEffects = List(Effect.unit, Effect.unit)
        const result = $(Effect.reduceAllPar(zeroElement, otherEffects, constVoid).exit)
        assert.isTrue(result == Exit.fail(1))
      }).unsafeRunPromiseExit())

    it("return error if it exists in list", () =>
      Do(($) => {
        const zeroElement = Effect.unit
        const effects = List(Effect.unit, Effect.failSync(1))
        const result = $(Effect.reduceAllPar(zeroElement, effects, constVoid).exit)
        assert.isTrue(result == Exit.fail(1))
      }).unsafeRunPromiseExit())
  })
})

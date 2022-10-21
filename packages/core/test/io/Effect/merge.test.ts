import { constVoid } from "@tsplus/stdlib/data/Function"

describe.concurrent("Effect", () => {
  describe.concurrent("merge", () => {
    it("on flipped result", () =>
      Do(($) => {
        const effect: Effect<never, number, number> = Effect.sync(1)
        const a = $(effect.merge)
        const b = $(effect.flip.merge)
        assert.strictEqual(a, b)
      }).unsafeRunPromise())
  })

  describe.concurrent("mergeAll", () => {
    it("return zero element on empty input", () =>
      Do(($) => {
        const zeroElement = 42
        const nonZero = 43
        const result = $(Effect.mergeAll(
          List.empty<Effect<never, never, unknown>>(),
          zeroElement,
          () => nonZero
        ))
        assert.strictEqual(result, zeroElement)
      }).unsafeRunPromise())

    it("merge list using function", () =>
      Do(($) => {
        const effects = List(3, 5, 7).map(Effect.succeed)
        const result = $(Effect.mergeAll(effects, 1, (b, a) => b + a))
        assert.strictEqual(result, 1 + 3 + 5 + 7)
      }).unsafeRunPromise())

    it("return error if it exists in list", () =>
      Do(($) => {
        const effects = List(Effect.unit, Effect.failSync(1))
        const result = $(Effect.mergeAll(effects, undefined, constVoid).exit)
        assert.isTrue(result == Exit.fail(1))
      }).unsafeRunPromiseExit())
  })

  describe.concurrent("mergeAllPar", () => {
    it("return zero element on empty input", () =>
      Do(($) => {
        const zeroElement = 42
        const nonZero = 43
        const result = $(Effect.mergeAllPar(
          List.empty<Effect<never, never, unknown>>(),
          zeroElement,
          () => nonZero
        ))
        assert.strictEqual(result, zeroElement)
      }).unsafeRunPromise())

    it("merge list using function", () =>
      Do(($) => {
        const effects = List(3, 5, 7).map(Effect.succeed)
        const result = $(Effect.mergeAllPar(effects, 1, (b, a) => b + a))
        assert.strictEqual(result, 1 + 3 + 5 + 7)
      }).unsafeRunPromise())

    it("return error if it exists in list", () =>
      Do(($) => {
        const effects = List(Effect.unit, Effect.failSync(1))
        const result = $(Effect.mergeAllPar(effects, undefined, constVoid).exit)
        assert.isTrue(result == Exit.fail(1))
      }).unsafeRunPromiseExit())
  })
})

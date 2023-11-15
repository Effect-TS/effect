import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as STM from "effect/STM"
import * as TRandom from "effect/TRandom"
import * as fc from "fast-check"
import { assert, describe } from "vitest"

const floatsArb: fc.Arbitrary<readonly [number, number]> = fc.tuple(
  fc.float({ noDefaultInfinity: true, noNaN: true }),
  fc.float({ noDefaultInfinity: true, noNaN: true })
)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => b > a ? [a, b] : [b, a])

const intsArb: fc.Arbitrary<readonly [number, number]> = fc.tuple(fc.integer(), fc.integer())
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => b > a ? [a, b] : [b, a])

describe.concurrent("TRandom", () => {
  it.it("nextIntBetween - generates integers in the specified range", () =>
    fc.assert(fc.asyncProperty(intsArb, async ([min, max]) => {
      const result = await pipe(
        STM.commit(TRandom.nextRange(min, max)),
        Effect.provide(TRandom.live),
        Effect.runPromise
      )
      assert.isAtLeast(result, min)
      assert.isBelow(result, max)
    })))

  it.it("nextRange - generates numbers in the specified range", () =>
    fc.assert(fc.asyncProperty(floatsArb, async ([min, max]) => {
      const result = await pipe(
        STM.commit(TRandom.nextRange(min, max)),
        Effect.provide(TRandom.live),
        Effect.runPromise
      )
      assert.isAtLeast(result, min)
      assert.isBelow(result, max)
    })))
})

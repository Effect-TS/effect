import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as fc from "effect/FastCheck"
import { pipe } from "effect/Function"
import * as STM from "effect/STM"
import * as TRandom from "effect/TRandom"

const floatsArb: fc.Arbitrary<readonly [number, number]> = fc.tuple(
  fc.float({ noDefaultInfinity: true, noNaN: true }),
  fc.float({ noDefaultInfinity: true, noNaN: true })
)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => b > a ? [a, b] : [b, a])

const intsArb: fc.Arbitrary<readonly [number, number]> = fc.tuple(fc.integer(), fc.integer())
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => b > a ? [a, b] : [b, a])

describe("TRandom", () => {
  it("nextIntBetween - generates integers in the specified range", () =>
    fc.assert(fc.asyncProperty(intsArb, async ([min, max]) => {
      const result = await pipe(
        STM.commit(TRandom.nextRange(min, max)),
        Effect.provide(TRandom.live),
        Effect.runPromise
      )
      assertTrue(result >= min)
      assertTrue(result < max)
    })))

  it("nextRange - generates numbers in the specified range", () =>
    fc.assert(fc.asyncProperty(floatsArb, async ([min, max]) => {
      const result = await pipe(
        STM.commit(TRandom.nextRange(min, max)),
        Effect.provide(TRandom.live),
        Effect.runPromise
      )
      assertTrue(result >= min)
      assertTrue(result < max)
    })))
})

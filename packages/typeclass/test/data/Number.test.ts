import * as NumberInstances from "@effect/typeclass/data/Number"
import { describe, it } from "@effect/vitest"
import * as U from "../util.js"

describe.concurrent("Number", () => {
  it("SemigroupMultiply", () => {
    const S = NumberInstances.SemigroupMultiply
    U.deepStrictEqual(S.combine(2, 3), 6)
    U.deepStrictEqual(S.combineMany(1, [1, 2, 3]), 6)
    U.deepStrictEqual(S.combineMany(1, [1, 0, 3]), 0)
    U.deepStrictEqual(S.combineMany(0, [1, 2, 3]), 0)
  })
})

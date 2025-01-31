import * as BooleanInstances from "@effect/typeclass/data/Boolean"
import { describe, it } from "@effect/vitest"
import * as U from "../util.js"

describe.concurrent("Boolean", () => {
  it("SemigroupEvery", () => {
    const S = BooleanInstances.SemigroupEvery
    U.deepStrictEqual(S.combine(true, true), true)
    U.deepStrictEqual(S.combine(true, false), false)
    U.deepStrictEqual(S.combineMany(true, [true, true, true]), true)
    U.deepStrictEqual(S.combineMany(false, [true, true, true]), false)
    U.deepStrictEqual(S.combineMany(true, [true, false, true]), false)
  })

  it("SemigroupSome", () => {
    const S = BooleanInstances.SemigroupSome
    U.deepStrictEqual(S.combine(true, true), true)
    U.deepStrictEqual(S.combine(true, false), true)
    U.deepStrictEqual(S.combine(false, false), false)
    U.deepStrictEqual(S.combineMany(false, [false, false, false]), false)
    U.deepStrictEqual(S.combineMany(true, [false, false, false]), true)
    U.deepStrictEqual(S.combineMany(false, [false, true, false]), true)
  })

  describe.concurrent("MonoidXor", () => {
    it("baseline", () => {
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineMany(true, []), true)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineMany(false, []), false)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineMany(false, [true]), true)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineMany(false, [false]), false)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineMany(true, [true]), false)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineMany(true, [false]), true)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineMany(true, [true, false]), false)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineMany(true, [false, true]), false)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineAll([true, false]), true)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineAll([false, true]), true)
    })

    it("should handle iterables", () => {
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineAll(new Set([true, true])), true)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineAll(new Set([true, false])), true)
      U.deepStrictEqual(BooleanInstances.MonoidXor.combineAll(new Set([false, false])), false)
    })
  })

  describe.concurrent("MonoidEqv", () => {
    it("baseline", () => {
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineMany(true, []), true)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineMany(false, []), false)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineMany(false, [true]), false)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineMany(false, [false]), true)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineMany(true, [true]), true)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineMany(true, [false]), false)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineMany(true, [true, false]), false)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineMany(true, [false, true]), false)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineAll([true, false]), false)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineAll([false, true]), false)
    })

    it("should handle iterables", () => {
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineAll(new Set([true, true])), true)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineAll(new Set([true, false])), false)
      U.deepStrictEqual(BooleanInstances.MonoidEqv.combineAll(new Set([false, false])), false)
    })
  })
})

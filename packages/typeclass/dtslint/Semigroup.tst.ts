import { Semigroup } from "@effect/typeclass"
import * as NumberInstances from "@effect/typeclass/data/Number"
import * as StringInstances from "@effect/typeclass/data/String"
import { describe, expect, it } from "tstyche"

describe("Semigroup", () => {
  it("tuple", () => {
    expect(Semigroup.tuple(
      StringInstances.Semigroup,
      NumberInstances.SemigroupSum
    )).type.toBe<Semigroup.Semigroup<readonly [string, number]>>()
  })

  it("struct", () => {
    expect(Semigroup.struct({
      a: StringInstances.Semigroup,
      b: NumberInstances.SemigroupSum
    })).type.toBe<Semigroup.Semigroup<{ readonly a: string; readonly b: number }>>()
  })
})

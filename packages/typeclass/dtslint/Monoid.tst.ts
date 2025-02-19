import { Monoid } from "@effect/typeclass"
import * as NumberInstances from "@effect/typeclass/data/Number"
import * as StringInstances from "@effect/typeclass/data/String"
import { describe, expect, it } from "tstyche"

describe("Monoid", () => {
  it("tuple", () => {
    expect(Monoid.tuple(
      StringInstances.Monoid,
      NumberInstances.MonoidSum
    )).type.toBe<Monoid.Monoid<readonly [string, number]>>()
  })

  it("struct", () => {
    expect(Monoid.struct({
      a: StringInstances.Monoid,
      b: NumberInstances.MonoidSum
    })).type.toBe<Monoid.Monoid<{ readonly a: string; readonly b: number }>>()
  })
})

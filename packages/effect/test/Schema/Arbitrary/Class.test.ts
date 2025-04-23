import { describe, it } from "@effect/vitest"
import { Arbitrary, FastCheck, Schema as S } from "effect"
import * as Util from "../TestUtils.js"

describe("Class", () => {
  it("baseline", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.String,
      b: S.NumberFromString
    }) {}
    Util.assertions.arbitrary.validateGeneratedValues(Class)
  })

  it("required property signature", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.Number
    }) {}
    Util.assertions.arbitrary.validateGeneratedValues(Class)
  })

  it("required property signature with undefined", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.Union(S.Number, S.Undefined)
    }) {}
    Util.assertions.arbitrary.validateGeneratedValues(Class)
  })

  it("exact optional property signature", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.optionalWith(S.Number, { exact: true })
    }) {}
    Util.assertions.arbitrary.validateGeneratedValues(Class)
  })

  it("exact optional property signature with undefined", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true })
    }) {}
    Util.assertions.arbitrary.validateGeneratedValues(Class)
  })

  it("transformation property signature with annotation (#4550)", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.NumberFromString.annotations({
        arbitrary: () => (fc) => fc.constant(1)
      })
    }) {}
    const arb = Arbitrary.make(Class)
    FastCheck.assert(FastCheck.property(arb, (a) => a.a === 1))
  })
})

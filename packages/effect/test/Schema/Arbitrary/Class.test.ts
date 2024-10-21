import * as S from "effect/Schema"
import { expectValidArbitrary } from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Class", () => {
  it("required property signature", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.Number
    }) {}
    expectValidArbitrary(Class)
  })

  it("required property signature with undefined", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.Union(S.Number, S.Undefined)
    }) {}
    expectValidArbitrary(Class)
  })

  it("exact optional property signature", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.optionalWith(S.Number, { exact: true })
    }) {}
    expectValidArbitrary(Class)
  })

  it("exact optional property signature with undefined", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.optionalWith(S.Union(S.Number, S.Undefined), { exact: true })
    }) {}
    expectValidArbitrary(Class)
  })

  it("baseline", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.String,
      b: S.NumberFromString
    }) {}
    expectValidArbitrary(Class)
  })
})

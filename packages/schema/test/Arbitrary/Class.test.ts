import * as S from "@effect/schema/Schema"
import { expectValidArbitrary } from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("class", () => {
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

  it("optional property signature", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.optional(S.Number, { exact: true })
    }) {}
    expectValidArbitrary(Class)
  })

  it("optional property signature with undefined", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.optional(S.Union(S.Number, S.Undefined), { exact: true })
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

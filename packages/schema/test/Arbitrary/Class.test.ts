import * as S from "@effect/schema/Schema"
import { expectValidArbitrary } from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("class", () => {
  it("required property signature", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.number
    }) {}
    expectValidArbitrary(Class)
  })

  it("required property signature with undefined", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.union(S.number, S.undefined)
    }) {}
    expectValidArbitrary(Class)
  })

  it("optional property signature", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.optional(S.number, { exact: true })
    }) {}
    expectValidArbitrary(Class)
  })

  it("optional property signature with undefined", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.optional(S.union(S.number, S.undefined), { exact: true })
    }) {}
    expectValidArbitrary(Class)
  })

  it("baseline", () => {
    class Class extends S.Class<Class>("Class")({
      a: S.string,
      b: S.NumberFromString
    }) {}
    expectValidArbitrary(Class)
  })
})

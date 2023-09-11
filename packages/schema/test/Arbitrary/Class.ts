import * as S from "@effect/schema/Schema"
import { propertyTo } from "@effect/schema/test/Arbitrary/Arbitrary"

describe.concurrent("class", () => {
  it("required property signature", () => {
    class Class extends S.Class()({
      a: S.number
    }) {}
    propertyTo(Class)
  })

  it("required property signature with undefined", () => {
    class Class extends S.Class()({
      a: S.union(S.number, S.undefined)
    }) {}
    propertyTo(Class)
  })

  it("optional property signature", () => {
    class Class extends S.Class()({
      a: S.optional(S.number)
    }) {}
    propertyTo(Class)
  })

  it("optional property signature with undefined", () => {
    class Class extends S.Class()({
      a: S.optional(S.union(S.number, S.undefined))
    }) {}
    propertyTo(Class)
  })

  it("baseline", () => {
    class Class extends S.Class()({
      a: S.string,
      b: S.NumberFromString
    }) {}
    propertyTo(Class)
  })
})

import * as S from "@effect/schema/Schema"
import { propertyTo } from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("class", () => {
  it("required property signature", () => {
    class Class extends S.Class<Class>()({
      a: S.number
    }) {}
    propertyTo(Class)
  })

  it("required property signature with undefined", () => {
    class Class extends S.Class<Class>()({
      a: S.union(S.number, S.undefined)
    }) {}
    propertyTo(Class)
  })

  it("optional property signature", () => {
    class Class extends S.Class<Class>()({
      a: S.optional(S.number, { exact: true })
    }) {}
    propertyTo(Class)
  })

  it("optional property signature with undefined", () => {
    class Class extends S.Class<Class>()({
      a: S.optional(S.union(S.number, S.undefined), { exact: true })
    }) {}
    propertyTo(Class)
  })

  it("baseline", () => {
    class Class extends S.Class<Class>()({
      a: S.string,
      b: S.NumberFromString
    }) {}
    propertyTo(Class)
  })
})

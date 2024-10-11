import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("validateOption", () => {
  it("should return none on async", () => {
    Util.expectNone(S.validateOption(Util.AsyncDeclaration)("a"))
  })

  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    Util.expectSome(S.validateOption(schema)({ a: 1 }), { a: 1 })
    Util.expectNone(S.validateOption(schema)({ a: null }))
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    Util.expectNone(S.validateOption(schema)(input, { onExcessProperty: "error" }))
    Util.expectNone(S.validateOption(schema, { onExcessProperty: "error" })(input))
    Util.expectSome(S.validateOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), {
      a: 1
    })
  })
})

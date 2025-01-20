import { Option, Schema as S } from "effect"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("validateOption", () => {
  it("should return none on async", () => {
    expect(S.validateOption(Util.AsyncDeclaration)("a")).toStrictEqual(Option.none())
  })

  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    expect(S.validateOption(schema)({ a: 1 })).toStrictEqual(Option.some({ a: 1 }))
    expect(S.validateOption(schema)({ a: null })).toStrictEqual(Option.none())
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    expect(S.validateOption(schema)(input, { onExcessProperty: "error" })).toStrictEqual(Option.none())
    expect(S.validateOption(schema, { onExcessProperty: "error" })(input)).toStrictEqual(Option.none())
    expect(S.validateOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }))
      .toStrictEqual(Option.some({ a: 1 }))
  })
})

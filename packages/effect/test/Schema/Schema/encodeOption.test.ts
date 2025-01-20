import { Option, Schema as S } from "effect"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("encodeOption", () => {
  it("should return none on async", () => {
    expect(S.encodeOption(Util.AsyncString)("a")).toStrictEqual(Option.none())
  })

  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    expect(S.encodeOption(schema)({ a: 1 })).toStrictEqual(Option.some({ a: "1" }))
    expect(S.encodeOption(schema)({ a: 10 })).toStrictEqual(Option.none())
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    expect(S.encodeOption(schema)(input, { onExcessProperty: "error" })).toStrictEqual(Option.none())
    expect(S.encodeOption(schema, { onExcessProperty: "error" })(input)).toStrictEqual(Option.none())
    expect(S.encodeOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" })).toStrictEqual(
      Option.some({ a: "1" })
    )
  })
})

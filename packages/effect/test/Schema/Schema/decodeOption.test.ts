import { Option, Schema as S } from "effect"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("decodeOption", () => {
  it("should return none on async", () => {
    expect(S.decodeOption(Util.AsyncString)("a")).toStrictEqual(Option.none())
  })

  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    expect(S.decodeOption(schema)({ a: "1" })).toStrictEqual(Option.some({ a: 1 }))
    expect(S.decodeOption(schema)({ a: "10" })).toStrictEqual(Option.none())
  })

  it("should respect outer/inner options", () => {
    const input = { a: "1", b: "b" }
    expect(S.decodeOption(schema)(input, { onExcessProperty: "error" })).toStrictEqual(Option.none())
    expect(S.decodeOption(schema, { onExcessProperty: "error" })(input)).toStrictEqual(Option.none())
    expect(S.decodeOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" })).toStrictEqual(
      Option.some({ a: 1 })
    )
  })
})

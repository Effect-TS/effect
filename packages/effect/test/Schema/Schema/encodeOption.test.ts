import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("encodeOption", () => {
  it("should return none on async", () => {
    Util.expectNone(S.encodeOption(Util.AsyncString)("a"))
  })

  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    Util.expectSome(S.encodeOption(schema)({ a: 1 }), { a: "1" })
    Util.expectNone(S.encodeOption(schema)({ a: 10 }))
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    Util.expectNone(S.encodeOption(schema)(input, { onExcessProperty: "error" }))
    Util.expectNone(S.encodeOption(schema, { onExcessProperty: "error" })(input))
    Util.expectSome(S.encodeOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), {
      a: "1"
    })
  })
})

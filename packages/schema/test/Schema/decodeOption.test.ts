import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > decodeOption", () => {
  it("should return none on async", () => {
    Util.expectNone(S.decodeOption(Util.AsyncString)("a"))
  })

  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    Util.expectSome(S.decodeOption(schema)({ a: "1" }), { a: 1 })
    Util.expectNone(S.decodeOption(schema)({ a: "10" }))
  })

  it("should respect outer/inner options", () => {
    const input = { a: "1", b: "b" }
    Util.expectNone(S.decodeOption(schema)(input, { onExcessProperty: "error" }))
    Util.expectNone(S.decodeOption(schema, { onExcessProperty: "error" })(input))
    Util.expectSome(S.decodeOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), {
      a: 1
    })
  })
})

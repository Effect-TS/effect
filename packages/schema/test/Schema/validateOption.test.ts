import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > validateOption", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

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

import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("Schema > parseOption", () => {
  const schema = S.struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    Util.expectSome(S.parseOption(schema)({ a: "1" }), { a: 1 })
    Util.expectNone(S.parseOption(schema)({ a: "10" }))
  })

  it("should respect outer/inner options", () => {
    const input = { a: "1", b: "b" }
    Util.expectNone(S.parseOption(schema)(input, { onExcessProperty: "error" }))
    Util.expectNone(S.parseOption(schema, { onExcessProperty: "error" })(input))
    Util.expectSome(S.parseOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), {
      a: 1
    })
  })
})

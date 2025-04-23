import { describe, it } from "@effect/vitest"
import { assertNone, assertSome } from "@effect/vitest/utils"
import { Schema as S } from "effect"
import * as Util from "../TestUtils.js"

describe("encodeOption", () => {
  it("should return none on async", () => {
    assertNone(S.encodeOption(Util.AsyncString)("a"))
  })

  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    assertSome(S.encodeOption(schema)({ a: 1 }), { a: "1" })
    assertNone(S.encodeOption(schema)({ a: 10 }))
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    assertNone(S.encodeOption(schema)(input, { onExcessProperty: "error" }))
    assertNone(S.encodeOption(schema, { onExcessProperty: "error" })(input))
    assertSome(S.encodeOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), { a: "1" })
  })
})

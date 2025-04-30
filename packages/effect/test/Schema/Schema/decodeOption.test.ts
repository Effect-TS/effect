import { describe, it } from "@effect/vitest"
import { assertNone, assertSome } from "@effect/vitest/utils"
import { Schema as S } from "effect"
import * as Util from "../TestUtils.js"

describe("decodeOption", () => {
  it("should return none on async", () => {
    assertNone(S.decodeOption(Util.AsyncString)("a"))
  })

  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    assertSome(S.decodeOption(schema)({ a: "1" }), { a: 1 })
    assertNone(S.decodeOption(schema)({ a: "10" }))
  })

  it("should respect outer/inner options", () => {
    const input = { a: "1", b: "b" }
    assertNone(S.decodeOption(schema)(input, { onExcessProperty: "error" }))
    assertNone(S.decodeOption(schema, { onExcessProperty: "error" })(input))
    assertSome(S.decodeOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), { a: 1 })
  })
})

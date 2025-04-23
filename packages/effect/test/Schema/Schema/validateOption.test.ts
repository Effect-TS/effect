import { describe, it } from "@effect/vitest"
import { assertNone, assertSome } from "@effect/vitest/utils"
import { Schema as S } from "effect"
import * as Util from "../TestUtils.js"

describe("validateOption", () => {
  it("should return none on async", () => {
    assertNone(S.validateOption(Util.AsyncDeclaration)("a"))
  })

  const schema = S.Struct({ a: Util.NumberFromChar })

  it("should return None on invalid values", () => {
    assertSome(S.validateOption(schema)({ a: 1 }), { a: 1 })
    assertNone(S.validateOption(schema)({ a: null }))
  })

  it("should respect outer/inner options", () => {
    const input = { a: 1, b: "b" }
    assertNone(S.validateOption(schema)(input, { onExcessProperty: "error" }))
    assertNone(S.validateOption(schema, { onExcessProperty: "error" })(input))
    assertSome(S.validateOption(schema, { onExcessProperty: "error" })(input, { onExcessProperty: "ignore" }), { a: 1 })
  })
})

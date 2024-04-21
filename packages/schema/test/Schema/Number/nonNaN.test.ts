import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("NonNaN", () => {
  const schema = S.NonNaN

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is(1)).toEqual(true)
    expect(is(NaN)).toEqual(false)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectDecodeUnknownFailure(
      schema,
      NaN,
      `NonNaN
└─ Predicate refinement failure
   └─ Expected NonNaN (a number excluding NaN), actual NaN`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(1)).toEqual("1")
    expect(pretty(NaN)).toEqual("NaN")
  })
})

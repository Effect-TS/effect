import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, expect, it } from "vitest"

describe("lessThanOrEqualTo", () => {
  it("property tests", () => {
    Util.roundtrip(S.lessThanOrEqualTo(0)(S.Number))
  })

  it("is", () => {
    const is = P.is(S.lessThanOrEqualTo(0)(S.Number))
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(false)
    expect(is(-1)).toEqual(true)
  })

  it("decoding", async () => {
    const schema = S.lessThanOrEqualTo(0)(S.Number)
    await Util.expectDecodeUnknownSuccess(schema, 0)
    await Util.expectDecodeUnknownSuccess(schema, -1)
    await Util.expectDecodeUnknownFailure(
      schema,
      1,
      `a non-positive number
└─ Predicate refinement failure
   └─ Expected a non-positive number, actual 1`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(S.lessThanOrEqualTo(0)(S.Number))
    expect(pretty(1)).toEqual("1")
  })
})

import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number/JsonNumber", () => {
  it("property tests", () => {
    Util.roundtrip(S.JsonNumber)
  })

  it("should exclude NaN from decoding", async () => {
    await Util.expectParseFailure(S.JsonNumber, NaN, "Expected JsonNumber, actual NaN")
    await Util.expectParseFailure(S.JsonNumber, Number.NaN, "Expected JsonNumber, actual NaN")
  })

  it("should exclude +/- Infinity from decoding", async () => {
    await Util.expectParseFailure(
      S.JsonNumber,
      Infinity,
      "Expected JsonNumber, actual Infinity"
    )
    await Util.expectParseFailure(
      S.JsonNumber,
      -Infinity,
      "Expected JsonNumber, actual -Infinity"
    )
    await Util.expectParseFailure(
      S.JsonNumber,
      Number.POSITIVE_INFINITY,
      "Expected JsonNumber, actual Infinity"
    )
    await Util.expectParseFailure(
      S.JsonNumber,
      Number.NEGATIVE_INFINITY,
      "Expected JsonNumber, actual -Infinity"
    )
  })
})

import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Json", () => {
  it("property tests. json", () => {
    Util.roundtrip(S.JsonNumber)
  })

  it("should exclude NaN", () => {
    Util.expectParseFailure(S.JsonNumber, NaN, "Expected a JSON number, actual NaN")
    Util.expectParseFailure(S.JsonNumber, Number.NaN, "Expected a JSON number, actual NaN")
  })

  it("should exclude +/- Infinity", () => {
    Util.expectParseFailure(S.JsonNumber, Infinity, "Expected a JSON number, actual Infinity")
    Util.expectParseFailure(S.JsonNumber, -Infinity, "Expected a JSON number, actual -Infinity")
    Util.expectParseFailure(
      S.JsonNumber,
      Number.POSITIVE_INFINITY,
      "Expected a JSON number, actual Infinity"
    )
    Util.expectParseFailure(
      S.JsonNumber,
      Number.NEGATIVE_INFINITY,
      "Expected a JSON number, actual -Infinity"
    )
  })
})

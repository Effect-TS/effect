import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("number > JsonNumber", () => {
  it("property tests", () => {
    Util.roundtrip(S.JsonNumber)
  })

  it("should exclude NaN from decoding", async () => {
    await Util.expectParseFailure(
      S.JsonNumber,
      NaN,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a JSON number, actual NaN`
    )
    await Util.expectParseFailure(
      S.JsonNumber,
      Number.NaN,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a JSON number, actual NaN`
    )
  })

  it("should exclude +/- Infinity from decoding", async () => {
    await Util.expectParseFailure(
      S.JsonNumber,
      Infinity,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a JSON number, actual Infinity`
    )
    await Util.expectParseFailure(
      S.JsonNumber,
      -Infinity,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a JSON number, actual -Infinity`
    )
    await Util.expectParseFailure(
      S.JsonNumber,
      Number.POSITIVE_INFINITY,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a JSON number, actual Infinity`
    )
    await Util.expectParseFailure(
      S.JsonNumber,
      Number.NEGATIVE_INFINITY,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a JSON number, actual -Infinity`
    )
  })
})

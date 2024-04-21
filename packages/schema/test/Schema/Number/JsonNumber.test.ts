import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { describe, it } from "vitest"

describe("JsonNumber", () => {
  it("property tests", () => {
    Util.roundtrip(S.JsonNumber)
  })

  it("should exclude NaN from decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      NaN,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected JsonNumber (a JSON-compatible number, excluding NaN, +Infinity, and -Infinity), actual NaN`
    )
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      Number.NaN,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected JsonNumber (a JSON-compatible number, excluding NaN, +Infinity, and -Infinity), actual NaN`
    )
  })

  it("should exclude +/- Infinity from decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      Infinity,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected JsonNumber (a JSON-compatible number, excluding NaN, +Infinity, and -Infinity), actual Infinity`
    )
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      -Infinity,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected JsonNumber (a JSON-compatible number, excluding NaN, +Infinity, and -Infinity), actual -Infinity`
    )
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      Number.POSITIVE_INFINITY,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected JsonNumber (a JSON-compatible number, excluding NaN, +Infinity, and -Infinity), actual Infinity`
    )
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      Number.NEGATIVE_INFINITY,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected JsonNumber (a JSON-compatible number, excluding NaN, +Infinity, and -Infinity), actual -Infinity`
    )
  })
})

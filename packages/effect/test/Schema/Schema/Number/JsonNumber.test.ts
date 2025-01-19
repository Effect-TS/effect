import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("JsonNumber", () => {
  it("property tests", () => {
    Util.assertions.roundtrip(S.JsonNumber)
  })

  it("should exclude NaN from decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      NaN,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual NaN`
    )
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      Number.NaN,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual NaN`
    )
  })

  it("should exclude +/- Infinity from decoding", async () => {
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      Infinity,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual Infinity`
    )
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      -Infinity,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual -Infinity`
    )
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      Number.POSITIVE_INFINITY,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual Infinity`
    )
    await Util.expectDecodeUnknownFailure(
      S.JsonNumber,
      Number.NEGATIVE_INFINITY,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual -Infinity`
    )
  })
})

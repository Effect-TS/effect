import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("JsonNumber", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.JsonNumber)
  })

  it("should exclude NaN from decoding", async () => {
    await Util.assertions.decoding.fail(
      S.JsonNumber,
      NaN,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual NaN`
    )
    await Util.assertions.decoding.fail(
      S.JsonNumber,
      Number.NaN,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual NaN`
    )
  })

  it("should exclude +/- Infinity from decoding", async () => {
    await Util.assertions.decoding.fail(
      S.JsonNumber,
      Infinity,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual Infinity`
    )
    await Util.assertions.decoding.fail(
      S.JsonNumber,
      -Infinity,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual -Infinity`
    )
    await Util.assertions.decoding.fail(
      S.JsonNumber,
      Number.POSITIVE_INFINITY,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual Infinity`
    )
    await Util.assertions.decoding.fail(
      S.JsonNumber,
      Number.NEGATIVE_INFINITY,
      `JsonNumber
└─ Predicate refinement failure
   └─ Expected a finite number, actual -Infinity`
    )
  })
})

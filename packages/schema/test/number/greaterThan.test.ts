import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("number > greaterThan", () => {
  const schema = S.greaterThan(0)(S.number)

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is(0)).toEqual(false)
    expect(is(1)).toEqual(true)
    expect(is(-1)).toEqual(false)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectDecodeUnknownFailure(
      schema,
      0,
      `a positive number
└─ Predicate refinement failure
   └─ Expected a positive number, actual 0`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      -1,
      `a positive number
└─ Predicate refinement failure
   └─ Expected a positive number, actual -1`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(1)).toEqual("1")
  })
})

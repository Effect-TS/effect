import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("number > multipleOf", () => {
  it("property tests", () => {
    Util.roundtrip(S.multipleOf(2)(S.number))
  })

  it("is", () => {
    const schema = S.number.pipe(S.multipleOf(-.2))
    const is = P.is(schema)
    expect(is(-2.8)).toEqual(true)
    expect(is(-2)).toEqual(true)
    expect(is(-1.5)).toEqual(false)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(2.6)).toEqual(true)
    expect(is(3.1)).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.number.pipe(S.multipleOf(2), S.identifier("Even"))
    await Util.expectDecodeUnknownSuccess(schema, -4)
    await Util.expectDecodeUnknownFailure(
      schema,
      -3,
      `Even
└─ Predicate refinement failure
   └─ Expected Even (a number divisible by 2), actual -3`
    )
    await Util.expectDecodeUnknownSuccess(schema, 0)
    await Util.expectDecodeUnknownSuccess(schema, 2)
    await Util.expectDecodeUnknownFailure(
      schema,
      2.5,
      `Even
└─ Predicate refinement failure
   └─ Expected Even (a number divisible by 2), actual 2.5`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `Even
└─ From side refinement failure
   └─ Expected a number, actual ""`
    )
  })
})

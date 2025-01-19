import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("Int", () => {
  const schema = S.Int

  it("property tests", () => {
    Util.assertions.roundtrip(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(0.5)).toEqual(false)
    expect(is(Number.MAX_SAFE_INTEGER + 1)).toEqual(false)
    expect(is(Number.MIN_SAFE_INTEGER - 1)).toEqual(false)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0)
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectDecodeUnknownFailure(
      schema,
      0.5,
      `Int
└─ Predicate refinement failure
   └─ Expected an integer, actual 0.5`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(1)).toEqual("1")
  })
})

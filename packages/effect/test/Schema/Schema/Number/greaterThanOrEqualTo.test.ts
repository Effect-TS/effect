import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("greaterThanOrEqualTo", () => {
  const schema = S.greaterThanOrEqualTo(0)(S.Number)

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is(0)).toEqual(true)
    expect(is(1)).toEqual(true)
    expect(is(-1)).toEqual(false)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0)
    await Util.expectDecodeUnknownSuccess(schema, 1)
    await Util.expectDecodeUnknownFailure(
      schema,
      -1,
      `a non-negative number
└─ Predicate refinement failure
   └─ Expected a non-negative number, actual -1`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty(1)).toEqual("1")
  })
})

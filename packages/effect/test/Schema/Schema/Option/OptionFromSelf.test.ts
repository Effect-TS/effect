import * as O from "effect/Option"
import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("OptionFromSelf", () => {
  it("arbitrary", () => {
    Util.assertions.arbitrary.is(S.OptionFromSelf(S.Number))
  })

  it("property tests", () => {
    Util.assertions.roundtrip(S.OptionFromSelf(S.NumberFromString))
  })

  it("is", () => {
    const schema = S.OptionFromSelf(S.Number)
    const is = P.is(schema)
    expect(is(O.none())).toEqual(true)
    expect(is(O.some(1))).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is(O.some("a"))).toEqual(false)

    expect(is({ _tag: "None" })).toEqual(false)
    expect(is({ _tag: "Some", value: 1 })).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.OptionFromSelf(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, O.none(), O.none())
    await Util.expectDecodeUnknownSuccess(schema, O.some("1"), O.some(1))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected Option<NumberFromString>, actual null`
    )
  })

  it("pretty", () => {
    const schema = S.OptionFromSelf(S.Number)
    const pretty = Pretty.make(schema)
    expect(pretty(O.none())).toEqual("none()")
    expect(pretty(O.some(1))).toEqual("some(1)")
  })
})

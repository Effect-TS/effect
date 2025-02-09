import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("maxLength", () => {
  it("property tests", () => {
    Util.roundtrip(S.maxLength(0)(S.String))
  })

  it("is", () => {
    const is = P.is(S.maxLength(1)(S.String))
    expect(is("")).toEqual(true)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.maxLength(1)(S.String)
    await Util.expectDecodeUnknownSuccess(schema, "")
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownFailure(
      schema,
      "aa",
      `maxLength(1)
└─ Predicate refinement failure
   └─ Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(S.maxLength(0)(S.String))
    expect(pretty("a")).toEqual(`"a"`)
  })
})

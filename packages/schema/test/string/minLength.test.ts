import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("string > minLength", () => {
  it("property tests", () => {
    Util.roundtrip(S.minLength(0)(S.string))
  })

  it("is", () => {
    const is = P.is(S.minLength(1)(S.string))
    expect(is("")).toEqual(false)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(true)
  })

  it("decoding", async () => {
    const schema = S.minLength(1)(S.string)
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "aa")
    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `a string at least 1 character(s) long
└─ Predicate refinement failure
   └─ Expected a string at least 1 character(s) long, actual ""`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(S.minLength(0)(S.string))
    expect(pretty("a")).toEqual(`"a"`)
  })
})

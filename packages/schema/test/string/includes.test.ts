import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("string > includes", () => {
  const schema = S.includes("a")(S.string)

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is("")).toEqual(false)
    expect(is("a")).toEqual(true)
    expect(is("aa")).toEqual(true)
    expect(is("bac")).toEqual(true)
    expect(is("ba")).toEqual(true)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, "a")
    await Util.expectParseSuccess(schema, "aa")
    await Util.expectParseSuccess(schema, "bac")
    await Util.expectParseSuccess(schema, "ba")
    await Util.expectParseFailure(
      schema,
      "",
      `a string including "a"
└─ Predicate refinement failure
   └─ Expected a string including "a", actual ""`
    )
  })

  it("Pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty("a")).toEqual(`"a"`)
  })
})

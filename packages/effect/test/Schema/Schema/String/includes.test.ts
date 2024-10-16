import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("includes", () => {
  const schema = S.includes("a")(S.String)

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
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "aa")
    await Util.expectDecodeUnknownSuccess(schema, "bac")
    await Util.expectDecodeUnknownSuccess(schema, "ba")
    await Util.expectDecodeUnknownFailure(
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

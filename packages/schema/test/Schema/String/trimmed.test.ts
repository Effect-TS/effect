import * as P from "@effect/schema/ParseResult"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("string/trimmed", () => {
  const schema = S.Trimmed

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("")).toEqual(true)
    expect(is("a ")).toEqual(false)
    expect(is(" a")).toEqual(false)
    expect(is(" a ")).toEqual(false)
    expect(is(" ")).toEqual(false)
    expect(is("a\nb")).toEqual(true)
    expect(is("a\nb ")).toEqual(false)
    expect(is(" a\nb")).toEqual(false)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "")
    await Util.expectDecodeUnknownFailure(
      schema,
      "a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed (a string with no leading or trailing whitespace), actual "a "`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " a",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed (a string with no leading or trailing whitespace), actual " a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed (a string with no leading or trailing whitespace), actual " a "`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, "a", "a")
    await Util.expectEncodeSuccess(schema, "", "")
    await Util.expectEncodeFailure(
      schema,
      "a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed (a string with no leading or trailing whitespace), actual "a "`
    )
    await Util.expectEncodeFailure(
      schema,
      " a",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed (a string with no leading or trailing whitespace), actual " a"`
    )
    await Util.expectEncodeFailure(
      schema,
      " a ",
      `Trimmed
└─ Predicate refinement failure
   └─ Expected Trimmed (a string with no leading or trailing whitespace), actual " a "`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    expect(pretty("a")).toEqual(`"a"`)
    expect(pretty("")).toEqual(`""`)
  })
})

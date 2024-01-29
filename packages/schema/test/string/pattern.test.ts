import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("string > pattern", () => {
  it("is", () => {
    const schema = S.string.pipe(S.pattern(/^abb+$/))
    const is = S.is(schema)
    expect(is("abb")).toEqual(true)
    expect(is("abbb")).toEqual(true)

    expect(is("ab")).toEqual(false)
    expect(is("a")).toEqual(false)
  })

  it("should reset lastIndex to 0 before each `test` call (#88)", () => {
    const regex = /^(A|B)$/g
    const schema = S.string.pipe(S.pattern(regex))
    expect(S.decodeSync(schema)("A")).toEqual("A")
    expect(S.decodeSync(schema)("A")).toEqual("A")
  })

  it("decoding", async () => {
    const schema = S.string.pipe(S.pattern(/^abb+$/))
    await Util.expectDecodeUnknownSuccess(schema, "abb")
    await Util.expectDecodeUnknownSuccess(schema, "abbb")

    await Util.expectDecodeUnknownFailure(
      schema,
      "ab",
      `a string matching the pattern ^abb+$
└─ Predicate refinement failure
   └─ Expected a string matching the pattern ^abb+$, actual "ab"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `a string matching the pattern ^abb+$
└─ Predicate refinement failure
   └─ Expected a string matching the pattern ^abb+$, actual "a"`
    )
  })
})

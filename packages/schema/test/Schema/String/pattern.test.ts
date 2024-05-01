import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { jestExpect as expect } from "@jest/expect"
import { describe, it } from "vitest"

describe("pattern", () => {
  it("is", () => {
    const schema = S.String.pipe(S.pattern(/^abb+$/))
    const is = S.is(schema)
    expect(is("abb")).toEqual(true)
    expect(is("abbb")).toEqual(true)

    expect(is("ab")).toEqual(false)
    expect(is("a")).toEqual(false)
  })

  it("should reset lastIndex to 0 before each `test` call (#88)", () => {
    const regexp = /^(A|B)$/g
    const schema = S.String.pipe(S.pattern(regexp))
    expect(S.decodeSync(schema)("A")).toEqual("A")
    expect(S.decodeSync(schema)("A")).toEqual("A")
  })

  it("should expose a regexp field", () => {
    const regexp = /^(A|B)$/g
    const schema = S.String.pipe(S.pattern(regexp))
    expect(schema.regexp).toStrictEqual(regexp)
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.pattern(/^abb+$/))
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

import * as P from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("string > endsWith", () => {
  it("is", () => {
    const schema = S.string.pipe(S.endsWith("a"))
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("ba")).toEqual(true)

    expect(is("")).toEqual(false)
    expect(is("b")).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.string.pipe(S.endsWith("a"))
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "ba")

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `a string ending with "a"
└─ Predicate refinement failure
   └─ Expected a string ending with "a", actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "b",
      `a string ending with "a"
└─ Predicate refinement failure
   └─ Expected a string ending with "a", actual "b"`
    )
  })
})

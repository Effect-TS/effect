import * as P from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, expect, it } from "vitest"

describe("string > startsWith", () => {
  it("is", () => {
    const schema = S.string.pipe(S.startsWith("a"))
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("ab")).toEqual(true)

    expect(is("")).toEqual(false)
    expect(is("b")).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.string.pipe(S.startsWith("a"))
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "ab")

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `a string starting with "a"
└─ Predicate refinement failure
   └─ Expected a string starting with "a", actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "b",
      `a string starting with "a"
└─ Predicate refinement failure
   └─ Expected a string starting with "a", actual "b"`
    )
  })
})

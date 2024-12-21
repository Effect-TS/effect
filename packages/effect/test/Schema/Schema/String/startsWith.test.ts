import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("startsWith", () => {
  it("is", () => {
    const schema = S.String.pipe(S.startsWith("a"))
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("ab")).toEqual(true)

    expect(is("")).toEqual(false)
    expect(is("b")).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.startsWith("a"))
    await Util.expectDecodeUnknownSuccess(schema, "a")
    await Util.expectDecodeUnknownSuccess(schema, "ab")

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `startsWith("a")
└─ Predicate refinement failure
   └─ Expected a string starting with "a", actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "b",
      `startsWith("a")
└─ Predicate refinement failure
   └─ Expected a string starting with "a", actual "b"`
    )
  })
})

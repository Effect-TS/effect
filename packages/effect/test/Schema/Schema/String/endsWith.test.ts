import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("endsWith", () => {
  it("is", () => {
    const schema = S.String.pipe(S.endsWith("a"))
    const is = P.is(schema)
    expect(is("a")).toEqual(true)
    expect(is("ba")).toEqual(true)

    expect(is("")).toEqual(false)
    expect(is("b")).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.endsWith("a"))
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, "ba")

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `endsWith("a")
└─ Predicate refinement failure
   └─ Expected a string ending with "a", actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "b",
      `endsWith("a")
└─ Predicate refinement failure
   └─ Expected a string ending with "a", actual "b"`
    )
  })
})

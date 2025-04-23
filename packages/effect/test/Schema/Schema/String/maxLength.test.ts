import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("maxLength", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.String.pipe(S.maxLength(1)))
  })

  it("is", () => {
    const is = P.is(S.String.pipe(S.maxLength(1)))
    assertTrue(is(""))
    assertTrue(is("a"))
    assertFalse(is("aa"))
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.maxLength(1))
    await Util.assertions.decoding.succeed(schema, "")
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.fail(
      schema,
      "aa",
      `maxLength(1)
└─ Predicate refinement failure
   └─ Expected a string at most 1 character(s) long, actual "aa"`
    )
  })

  it("pretty", () => {
    const schema = S.String.pipe(S.maxLength(1))
    Util.assertions.pretty(schema, "a", `"a"`)
  })
})

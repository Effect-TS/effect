import { describe, it } from "@effect/vitest"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue } from "effect/test/util"

describe("maxLength", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.maxLength(0)(S.String))
  })

  it("is", () => {
    const is = P.is(S.maxLength(1)(S.String))
    assertTrue(is(""))
    assertTrue(is("a"))
    assertFalse(is("aa"))
  })

  it("decoding", async () => {
    const schema = S.maxLength(1)(S.String)
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
    const schema = S.maxLength(0)(S.String)
    Util.assertions.pretty(schema, "a", `"a"`)
  })
})

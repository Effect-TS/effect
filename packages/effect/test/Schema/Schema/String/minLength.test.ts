import { describe, it } from "@effect/vitest"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue } from "effect/test/util"

describe("minLength", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.minLength(0)(S.String))
  })

  it("is", () => {
    const is = P.is(S.minLength(1)(S.String))
    assertFalse(is(""))
    assertTrue(is("a"))
    assertTrue(is("aa"))
  })

  it("decoding", async () => {
    const schema = S.minLength(1)(S.String)
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, "aa")
    await Util.assertions.decoding.fail(
      schema,
      "",
      `minLength(1)
└─ Predicate refinement failure
   └─ Expected a string at least 1 character(s) long, actual ""`
    )
  })

  it("pretty", () => {
    const schema = S.minLength(0)(S.String)
    Util.assertions.pretty(schema, "a", `"a"`)
  })
})

import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("minLength", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.String.pipe(S.minLength(1)))
  })

  it("is", () => {
    const is = P.is(S.String.pipe(S.minLength(1)))
    assertFalse(is(""))
    assertTrue(is("a"))
    assertTrue(is("aa"))
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.minLength(1))
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
    const schema = S.String.pipe(S.minLength(1))
    Util.assertions.pretty(schema, "a", `"a"`)
  })
})

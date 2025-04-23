import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("includes", () => {
  const schema = S.String.pipe(S.includes("a"))

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    assertFalse(is(""))
    assertTrue(is("a"))
    assertTrue(is("aa"))
    assertTrue(is("bac"))
    assertTrue(is("ba"))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, "aa")
    await Util.assertions.decoding.succeed(schema, "bac")
    await Util.assertions.decoding.succeed(schema, "ba")
    await Util.assertions.decoding.fail(
      schema,
      "",
      `includes("a")
└─ Predicate refinement failure
   └─ Expected a string including "a", actual ""`
    )
  })

  it("Pretty", () => {
    Util.assertions.pretty(schema, "a", `"a"`)
  })
})

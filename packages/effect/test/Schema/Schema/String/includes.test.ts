import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue, strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("includes", () => {
  const schema = S.includes("a")(S.String)

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
    const pretty = Pretty.make(schema)
    strictEqual(pretty("a"), `"a"`)
  })
})

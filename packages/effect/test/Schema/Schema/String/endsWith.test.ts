import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("endsWith", () => {
  it("is", () => {
    const schema = S.String.pipe(S.endsWith("a"))
    const is = P.is(schema)
    assertTrue(is("a"))
    assertTrue(is("ba"))

    assertFalse(is(""))
    assertFalse(is("b"))
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.endsWith("a"))
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, "ba")

    await Util.assertions.decoding.fail(
      schema,
      "",
      `endsWith("a")
└─ Predicate refinement failure
   └─ Expected a string ending with "a", actual ""`
    )
    await Util.assertions.decoding.fail(
      schema,
      "b",
      `endsWith("a")
└─ Predicate refinement failure
   └─ Expected a string ending with "a", actual "b"`
    )
  })
})

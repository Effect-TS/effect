import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("startsWith", () => {
  it("is", () => {
    const schema = S.String.pipe(S.startsWith("a"))
    const is = P.is(schema)
    assertTrue(is("a"))
    assertTrue(is("ab"))

    assertFalse(is(""))
    assertFalse(is("b"))
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.startsWith("a"))
    await Util.assertions.decoding.succeed(schema, "a")
    await Util.assertions.decoding.succeed(schema, "ab")

    await Util.assertions.decoding.fail(
      schema,
      "",
      `startsWith("a")
└─ Predicate refinement failure
   └─ Expected a string starting with "a", actual ""`
    )
    await Util.assertions.decoding.fail(
      schema,
      "b",
      `startsWith("a")
└─ Predicate refinement failure
   └─ Expected a string starting with "a", actual "b"`
    )
  })
})

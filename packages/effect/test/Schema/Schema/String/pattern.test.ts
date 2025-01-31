import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue, strictEqual } from "effect/test/util"

describe("pattern", () => {
  it("is", () => {
    const schema = S.String.pipe(S.pattern(/^abb+$/))
    const is = S.is(schema)
    assertTrue(is("abb"))
    assertTrue(is("abbb"))

    assertFalse(is("ab"))
    assertFalse(is("a"))
  })

  it("should reset lastIndex to 0 before each `test` call (#88)", () => {
    const regexp = /^(A|B)$/g
    const schema = S.String.pipe(S.pattern(regexp))
    strictEqual(S.decodeSync(schema)("A"), "A")
    strictEqual(S.decodeSync(schema)("A"), "A")
  })

  it("decoding", async () => {
    const schema = S.String.pipe(S.pattern(/^abb+$/))
    await Util.assertions.decoding.succeed(schema, "abb")
    await Util.assertions.decoding.succeed(schema, "abbb")

    await Util.assertions.decoding.fail(
      schema,
      "ab",
      `a string matching the pattern ^abb+$
└─ Predicate refinement failure
   └─ Expected a string matching the pattern ^abb+$, actual "ab"`
    )
    await Util.assertions.decoding.fail(
      schema,
      "a",
      `a string matching the pattern ^abb+$
└─ Predicate refinement failure
   └─ Expected a string matching the pattern ^abb+$, actual "a"`
    )
  })
})

import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("NonNaN", () => {
  const schema = S.NonNaN

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    assertTrue(is(1))
    assertFalse(is(NaN))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.assertions.decoding.fail(
      schema,
      NaN,
      `NonNaN
└─ Predicate refinement failure
   └─ Expected a number excluding NaN, actual NaN`
    )
  })

  it("pretty", () => {
    Util.assertions.pretty(schema, 1, "1")
    Util.assertions.pretty(schema, NaN, "NaN")
  })
})

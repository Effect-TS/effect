import { describe, it } from "@effect/vitest"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue } from "effect/test/util"

describe("greaterThanOrEqualTo", () => {
  const schema = S.greaterThanOrEqualTo(0)(S.Number)

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    assertTrue(is(0))
    assertTrue(is(1))
    assertFalse(is(-1))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0)
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.assertions.decoding.fail(
      schema,
      -1,
      `greaterThanOrEqualTo(0)
└─ Predicate refinement failure
   └─ Expected a non-negative number, actual -1`
    )
  })

  it("pretty", () => {
    Util.assertions.pretty(schema, 1, "1")
  })
})

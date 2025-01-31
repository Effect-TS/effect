import { describe, it } from "@effect/vitest"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue } from "effect/test/util"

describe("greaterThan", () => {
  const schema = S.greaterThan(0)(S.Number)

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    assertFalse(is(0))
    assertTrue(is(1))
    assertFalse(is(-1))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.assertions.decoding.fail(
      schema,
      0,
      `greaterThan(0)
└─ Predicate refinement failure
   └─ Expected a positive number, actual 0`
    )
    await Util.assertions.decoding.fail(
      schema,
      -1,
      `greaterThan(0)
└─ Predicate refinement failure
   └─ Expected a positive number, actual -1`
    )
  })

  it("pretty", () => {
    Util.assertions.pretty(schema, 1, "1")
  })
})

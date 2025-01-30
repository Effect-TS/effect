import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue, strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

describe("Int", () => {
  const schema = S.Int

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("is", () => {
    const is = P.is(schema)
    assertTrue(is(0))
    assertTrue(is(1))
    assertFalse(is(0.5))
    assertFalse(is(Number.MAX_SAFE_INTEGER + 1))
    assertFalse(is(Number.MIN_SAFE_INTEGER - 1))
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, 0)
    await Util.assertions.decoding.succeed(schema, 1)
    await Util.assertions.decoding.fail(
      schema,
      0.5,
      `Int
└─ Predicate refinement failure
   └─ Expected an integer, actual 0.5`
    )
  })

  it("pretty", () => {
    const pretty = Pretty.make(schema)
    strictEqual(pretty(1), "1")
  })
})

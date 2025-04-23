import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as O from "effect/Option"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("OptionFromSelf", () => {
  it("arbitrary", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.OptionFromSelf(S.Number))
  })

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.OptionFromSelf(S.NumberFromString))
  })

  it("is", () => {
    const schema = S.OptionFromSelf(S.Number)
    const is = P.is(schema)
    assertTrue(is(O.none()))
    assertTrue(is(O.some(1)))
    assertFalse(is(null))
    assertFalse(is(O.some("a")))

    assertFalse(is({ _tag: "None" }))
    assertFalse(is({ _tag: "Some", value: 1 }))
  })

  it("decoding", async () => {
    const schema = S.OptionFromSelf(S.NumberFromString)
    await Util.assertions.decoding.succeed(schema, O.none(), O.none())
    await Util.assertions.decoding.succeed(schema, O.some("1"), O.some(1))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected Option<NumberFromString>, actual null`
    )
  })

  it("pretty", () => {
    const schema = S.OptionFromSelf(S.Number)
    Util.assertions.pretty(schema, O.none(), "none()")
    Util.assertions.pretty(schema, O.some(1), "some(1)")
  })
})

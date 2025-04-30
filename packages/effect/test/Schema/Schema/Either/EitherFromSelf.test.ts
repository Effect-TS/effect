import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import * as E from "effect/Either"
import * as P from "effect/ParseResult"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("EitherFromSelf", () => {
  it("arbitrary", () => {
    Util.assertions.arbitrary.validateGeneratedValues(S.EitherFromSelf({ left: S.String, right: S.Number }))
  })

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.EitherFromSelf({ left: S.String, right: S.Number }))
  })

  it("is", () => {
    const schema = S.EitherFromSelf({ left: S.String, right: S.Number })
    const is = P.is(schema)
    assertTrue(is(E.left("a")))
    assertTrue(is(E.right(1)))
    assertFalse(is(null))
    assertFalse(is(E.right("a")))
    assertFalse(is(E.left(1)))

    assertFalse(is({ _tag: "Right", right: 1 }))
    assertFalse(is({ _tag: "Left", left: "a" }))
  })

  it("decoding", async () => {
    const schema = S.EitherFromSelf({ left: S.NumberFromString, right: S.BooleanFromString })
    await Util.assertions.decoding.succeed(schema, E.left("1"), E.left(1))
    await Util.assertions.decoding.succeed(schema, E.right("true"), E.right(true))

    await Util.assertions.decoding.fail(
      schema,
      null,
      `Expected Either<BooleanFromString, NumberFromString>, actual null`
    )
    await Util.assertions.decoding.fail(
      schema,
      E.right(""),
      `Either<BooleanFromString, NumberFromString>
└─ BooleanFromString
   └─ Encoded side transformation failure
      └─ a string to be decoded into a boolean
         ├─ Expected "true", actual ""
         └─ Expected "false", actual ""`
    )
    await Util.assertions.decoding.fail(
      schema,
      E.left("a"),
      `Either<BooleanFromString, NumberFromString>
└─ NumberFromString
   └─ Transformation process failure
      └─ Unable to decode "a" into a number`
    )
  })

  it("pretty", () => {
    const schema = S.EitherFromSelf({ left: S.String, right: S.Number })
    Util.assertions.pretty(schema, E.left("a"), `left("a")`)
    Util.assertions.pretty(schema, E.right(1), "right(1)")
  })
})

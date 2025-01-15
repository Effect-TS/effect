import * as E from "effect/Either"
import * as P from "effect/ParseResult"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("EitherFromSelf", () => {
  it("arbitrary", () => {
    Util.expectArbitrary(S.EitherFromSelf({ left: S.String, right: S.Number }))
  })

  it("property tests", () => {
    Util.roundtrip(S.EitherFromSelf({ left: S.String, right: S.Number }))
  })

  it("is", () => {
    const schema = S.EitherFromSelf({ left: S.String, right: S.Number })
    const is = P.is(schema)
    expect(is(E.left("a"))).toEqual(true)
    expect(is(E.right(1))).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is(E.right("a"))).toEqual(false)
    expect(is(E.left(1))).toEqual(false)

    expect(is({ _tag: "Right", right: 1 })).toEqual(false)
    expect(is({ _tag: "Left", left: "a" })).toEqual(false)
  })

  it("decoding", async () => {
    const schema = S.EitherFromSelf({ left: S.NumberFromString, right: Util.BooleanFromLiteral })
    await Util.expectDecodeUnknownSuccess(schema, E.left("1"), E.left(1))
    await Util.expectDecodeUnknownSuccess(schema, E.right("true"), E.right(true))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected Either<("true" | "false" <-> boolean), NumberFromString>, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      E.right(""),
      `Either<("true" | "false" <-> boolean), NumberFromString>
└─ ("true" | "false" <-> boolean)
   └─ Encoded side transformation failure
      └─ "true" | "false"
         ├─ Expected "true", actual ""
         └─ Expected "false", actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      E.left("a"),
      `Either<("true" | "false" <-> boolean), NumberFromString>
└─ NumberFromString
   └─ Transformation process failure
      └─ Unable to decode "a" into a number`
    )
  })

  it("pretty", () => {
    const schema = S.EitherFromSelf({ left: S.String, right: S.Number })
    const pretty = Pretty.make(schema)
    expect(pretty(E.left("a"))).toEqual(`left("a")`)
    expect(pretty(E.right(1))).toEqual("right(1)")
  })
})

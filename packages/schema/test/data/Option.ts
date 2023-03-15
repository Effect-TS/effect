import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

const NumberFromString = S.numberFromString(S.string)

describe.concurrent("Option", () => {
  describe.concurrent("option", () => {
    it("property tests", () => {
      Util.roundtrip(S.option(S.number))
    })

    it("Decoder", () => {
      const schema = S.option(NumberFromString)
      Util.expectDecodingSuccess(schema, JSON.parse(JSON.stringify(O.none())), O.none())
      Util.expectDecodingSuccess(schema, JSON.parse(JSON.stringify(O.some("1"))), O.some(1))
    })

    it("Encoder", () => {
      const schema = S.option(NumberFromString)
      Util.expectEncodingSuccess(schema, O.none(), { _tag: "None" })
      Util.expectEncodingSuccess(schema, O.some(1), { _tag: "Some", value: "1" })
    })
  })

  describe.concurrent("optionFromSelf", () => {
    it("property tests", () => {
      Util.roundtrip(S.optionFromSelf(NumberFromString))
    })

    it("Guard", () => {
      const schema = S.optionFromSelf(S.number)
      const is = P.is(schema)
      expect(is(O.none())).toEqual(true)
      expect(is(O.some(1))).toEqual(true)
      expect(is(null)).toEqual(false)
      expect(is(O.some("a"))).toEqual(false)

      expect(is({ _tag: "None" })).toEqual(false)
      expect(is({ _tag: "Some", value: 1 })).toEqual(false)
    })

    it("Decoder", () => {
      const schema = S.optionFromSelf(NumberFromString)
      Util.expectDecodingSuccess(schema, O.none(), O.none())
      Util.expectDecodingSuccess(schema, O.some("1"), O.some(1))
    })

    it("Pretty", () => {
      const schema = S.optionFromSelf(S.number)
      const pretty = Pretty.to(schema)
      expect(pretty(O.none())).toEqual("none()")
      expect(pretty(O.some(1))).toEqual("some(1)")
    })
  })

  describe.concurrent("optionFromNullable", () => {
    it("property tests", () => {
      Util.roundtrip(S.optionFromNullable(S.number))
    })

    it("Decoder", () => {
      const schema = S.optionFromNullable(NumberFromString)
      Util.expectDecodingSuccess(schema, undefined, O.none())
      Util.expectDecodingSuccess(schema, null, O.none())
      Util.expectDecodingSuccess(schema, "1", O.some(1))

      expect(O.isOption(S.decode(schema)(null))).toEqual(true)
      expect(O.isOption(S.decode(schema)("1"))).toEqual(true)

      Util.expectDecodingFailureTree(
        schema,
        {},
        `error(s) found
├─ union member
│  └─ Expected undefined, actual {}
├─ union member
│  └─ Expected null, actual {}
└─ union member
   └─ Expected string, actual {}`
      )
    })

    it("Encoder", () => {
      const schema = S.optionFromNullable(NumberFromString)
      Util.expectEncodingSuccess(schema, O.none(), null)
      Util.expectEncodingSuccess(schema, O.some(1), "1")
    })
  })

  it("optionsFromOptionals", () => {
    expect(() => pipe(S.object, S.optionsFromOptionals({ "b": S.number }))).toThrowError(
      new Error("`parseOptional` can only handle type literals")
    )

    const schema = pipe(S.struct({ a: S.string }), S.optionsFromOptionals({ b: S.number }))
    Util.expectDecodingSuccess(schema, { a: "a" }, { a: "a", b: O.none() })
    Util.expectDecodingSuccess(schema, { a: "a", b: undefined }, { a: "a", b: O.none() })
    Util.expectDecodingSuccess(schema, { a: "a", b: null }, { a: "a", b: O.none() })
    Util.expectDecodingSuccess(schema, { a: "a", b: 1 }, { a: "a", b: O.some(1) })

    Util.expectDecodingFailureTree(
      schema,
      { a: "a", b: "b" },
      `error(s) found
└─ ["b"]
   ├─ union member
   │  └─ Expected undefined, actual "b"
   ├─ union member
   │  └─ Expected null, actual "b"
   └─ union member
      └─ Expected number, actual "b"`
    )

    Util.expectEncodingSuccess(schema, { a: "a", b: O.none() }, { a: "a" })
    Util.expectEncodingSuccess(schema, { a: "a", b: O.some(1) }, { a: "a", b: 1 })
  })
})

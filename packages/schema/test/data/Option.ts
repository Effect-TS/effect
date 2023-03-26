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

    it("Decoder", async () => {
      const schema = S.option(NumberFromString)
      await Util.expectParseSuccess(schema, JSON.parse(JSON.stringify(O.none())), O.none())
      await Util.expectParseSuccess(schema, JSON.parse(JSON.stringify(O.some("1"))), O.some(1))
    })

    it("Encoder", async () => {
      const schema = S.option(NumberFromString)
      await Util.expectEncodeSuccess(schema, O.none(), { _tag: "None" })
      await Util.expectEncodeSuccess(schema, O.some(1), { _tag: "Some", value: "1" })
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

    it("Decoder", async () => {
      const schema = S.optionFromSelf(NumberFromString)
      await Util.expectParseSuccess(schema, O.none(), O.none())
      await Util.expectParseSuccess(schema, O.some("1"), O.some(1))
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

    it("Decoder", async () => {
      const schema = S.optionFromNullable(NumberFromString)
      await Util.expectParseSuccess(schema, undefined, O.none())
      await Util.expectParseSuccess(schema, null, O.none())
      await Util.expectParseSuccess(schema, "1", O.some(1))

      expect(O.isOption(S.decode(schema)(null))).toEqual(true)
      expect(O.isOption(S.decode(schema)("1"))).toEqual(true)

      await Util.expectParseFailureTree(
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

    it("Encoder", async () => {
      const schema = S.optionFromNullable(NumberFromString)
      await Util.expectEncodeSuccess(schema, O.none(), null)
      await Util.expectEncodeSuccess(schema, O.some(1), "1")
    })
  })

  it("optionsFromOptionals", async () => {
    expect(() => pipe(S.object, S.optionsFromOptionals({ "b": S.number }))).toThrowError(
      new Error("`optionsFromOptionals` can only handle type literals")
    )
    expect(() => pipe(S.struct({ a: S.number }), S.optionsFromOptionals({ a: S.number })))
      .toThrowError(
        new Error("`optionsFromOptionals` cannot handle overlapping property signatures")
      )

    const schema = pipe(S.struct({ a: S.string }), S.optionsFromOptionals({ b: S.number }))
    await Util.expectParseSuccess(schema, { a: "a" }, { a: "a", b: O.none() })
    await Util.expectParseSuccess(schema, { a: "a", b: 1 }, { a: "a", b: O.some(1) })

    await Util.expectParseFailure(
      schema,
      { a: "a", b: undefined },
      "/b Expected number, actual undefined"
    )
    await Util.expectParseFailure(schema, { a: "a", b: null }, "/b Expected number, actual null")
    await Util.expectParseFailure(schema, { a: "a", b: "b" }, `/b Expected number, actual "b"`)

    await Util.expectEncodeSuccess(schema, { a: "a", b: O.none() }, { a: "a" })
    await Util.expectEncodeSuccess(schema, { a: "a", b: O.some(1) }, { a: "a", b: 1 })
  })
})

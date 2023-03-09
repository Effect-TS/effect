import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import * as S from "@effect/schema"
import { parseString } from "@effect/schema/data/Number"
import * as _ from "@effect/schema/data/Option"
import * as P from "@effect/schema/Parser"
import * as Pretty from "@effect/schema/Pretty"
import * as Util from "@effect/schema/test/util"

const NumberFromString = pipe(S.string, parseString)

describe.concurrent("Option", () => {
  it("option. property tests", () => {
    Util.property(_.parseNullable(NumberFromString))
  })

  it("option. Guard", () => {
    const schema = _.option(S.number)
    const is = P.is(schema)
    expect(is(O.none())).toEqual(true)
    expect(is(O.some(1))).toEqual(true)
    expect(is(null)).toEqual(false)
    expect(is(O.some("a"))).toEqual(false)

    expect(is({ _tag: "None" })).toEqual(false)
    expect(is({ _tag: "Some", value: 1 })).toEqual(false)
  })

  it("option. Decoder", () => {
    const schema = _.option(NumberFromString)
    Util.expectDecodingSuccess(schema, O.none(), O.none())
    Util.expectDecodingSuccess(schema, O.some("1"), O.some(1))
  })

  it("option. Pretty", () => {
    const schema = _.option(S.number)
    const pretty = Pretty.pretty(schema)
    expect(pretty(O.none())).toEqual("none()")
    expect(pretty(O.some(1))).toEqual("some(1)")
  })

  it("parseNullable. property tests", () => {
    Util.property(_.parseNullable(S.number))
  })

  it("parseNullable. Decoder", () => {
    const schema = _.parseNullable(NumberFromString)
    Util.expectDecodingSuccess(schema, undefined, O.none())
    Util.expectDecodingSuccess(schema, null, O.none())
    Util.expectDecodingSuccess(schema, "1", O.some(1))

    expect(O.isOption(S.decodeOrThrow(schema)(null))).toEqual(true)
    expect(O.isOption(S.decodeOrThrow(schema)("1"))).toEqual(true)

    Util.expectDecodingFailureTree(
      schema,
      {},
      `3 error(s) found
├─ union member
│  └─ Expected undefined, actual {}
├─ union member
│  └─ Expected null, actual {}
└─ union member
   └─ Expected string, actual {}`
    )
  })

  it("parseNullable. Encoder", () => {
    const schema = _.parseNullable(NumberFromString)
    Util.expectEncodingSuccess(schema, O.none(), null)
    Util.expectEncodingSuccess(schema, O.some(1), "1")
  })

  it("parseOptionals", () => {
    expect(() => pipe(S.object, _.parseOptionals({ "b": S.number }))).toThrowError(
      new Error("`parseOptional` can only handle type literals")
    )

    const schema = pipe(S.struct({ a: S.string }), _.parseOptionals({ b: S.number }))
    Util.expectDecodingSuccess(schema, { a: "a" }, { a: "a", b: O.none() })
    Util.expectDecodingSuccess(schema, { a: "a", b: undefined }, { a: "a", b: O.none() })
    Util.expectDecodingSuccess(schema, { a: "a", b: null }, { a: "a", b: O.none() })
    Util.expectDecodingSuccess(schema, { a: "a", b: 1 }, { a: "a", b: O.some(1) })

    Util.expectDecodingFailureTree(
      schema,
      { a: "a", b: "b" },
      `1 error(s) found
└─ key "b"
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

import * as O from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("OptionFromNullishOr", () => {
  it("property tests", () => {
    Util.roundtrip(S.OptionFromNullishOr(S.Number, null))
    Util.roundtrip(S.OptionFromNullishOr(S.Number, undefined))
  })

  it("decoding", async () => {
    const schema = S.OptionFromNullishOr(S.NumberFromString, undefined)
    await Util.expectDecodeUnknownSuccess(schema, null, O.none())
    await Util.expectDecodeUnknownSuccess(schema, undefined, O.none())
    await Util.expectDecodeUnknownSuccess(schema, "1", O.some(1))

    expect(O.isOption(S.decodeSync(schema)(null))).toEqual(true)
    expect(O.isOption(S.decodeSync(schema)(undefined))).toEqual(true)
    expect(O.isOption(S.decodeSync(schema)("1"))).toEqual(true)

    await Util.expectDecodeUnknownFailure(
      schema,
      {},
      `(NumberFromString | null | undefined <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | null | undefined
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual {}
      ├─ Expected null, actual {}
      └─ Expected undefined, actual {}`
    )
  })

  it("encoding null", async () => {
    const schema = S.OptionFromNullishOr(S.NumberFromString, null)
    await Util.expectEncodeSuccess(schema, O.none(), null)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })

  it("encoding undefined", async () => {
    const schema = S.OptionFromNullishOr(S.NumberFromString, undefined)
    await Util.expectEncodeSuccess(schema, O.none(), undefined)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })
})

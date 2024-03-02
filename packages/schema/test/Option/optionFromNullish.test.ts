import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Option > optionFromNullish", () => {
  it("property tests", () => {
    Util.roundtrip(S.optionFromNullish(S.number, null))
    Util.roundtrip(S.optionFromNullish(S.number, undefined))
  })

  it("decoding", async () => {
    const schema = S.optionFromNullish(S.NumberFromString, undefined)
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
      ├─ Union member
      │  └─ NumberFromString
      │     └─ Encoded side transformation failure
      │        └─ Expected a string, actual {}
      ├─ Union member
      │  └─ Expected null, actual {}
      └─ Union member
         └─ Expected undefined, actual {}`
    )
  })

  it("encoding null", async () => {
    const schema = S.optionFromNullish(S.NumberFromString, null)
    await Util.expectEncodeSuccess(schema, O.none(), null)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })

  it("encoding undefined", async () => {
    const schema = S.optionFromNullish(S.NumberFromString, undefined)
    await Util.expectEncodeSuccess(schema, O.none(), undefined)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })
})

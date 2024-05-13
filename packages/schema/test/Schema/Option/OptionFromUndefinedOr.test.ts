import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("OptionFromUndefinedOr", () => {
  it("property tests", () => {
    Util.roundtrip(S.OptionFromUndefinedOr(S.Number))
  })

  it("decoding", async () => {
    const schema = S.OptionFromUndefinedOr(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, undefined, O.none())
    await Util.expectDecodeUnknownSuccess(schema, "1", O.some(1))

    expect(O.isOption(S.decodeSync(schema)(undefined))).toEqual(true)
    expect(O.isOption(S.decodeSync(schema)("1"))).toEqual(true)

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `(NumberFromString | undefined <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | undefined
      ├─ Union member
      │  └─ NumberFromString
      │     └─ Encoded side transformation failure
      │        └─ Expected a string, actual null
      └─ Union member
         └─ Expected undefined, actual null`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      {},
      `(NumberFromString | undefined <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | undefined
      ├─ Union member
      │  └─ NumberFromString
      │     └─ Encoded side transformation failure
      │        └─ Expected a string, actual {}
      └─ Union member
         └─ Expected undefined, actual {}`
    )
  })

  it("encoding", async () => {
    const schema = S.OptionFromUndefinedOr(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, O.none(), undefined)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })
})

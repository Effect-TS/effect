import * as O from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("OptionFromNullOr", () => {
  it("property tests", () => {
    Util.assertions.roundtrip(S.OptionFromNullOr(S.Number))
  })

  it("decoding", async () => {
    const schema = S.OptionFromNullOr(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, null, O.none())
    await Util.expectDecodeUnknownSuccess(schema, "1", O.some(1))

    expect(O.isOption(S.decodeSync(schema)(null))).toEqual(true)
    expect(O.isOption(S.decodeSync(schema)("1"))).toEqual(true)

    await Util.expectDecodeUnknownFailure(
      schema,
      undefined,
      `(NumberFromString | null <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | null
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual undefined
      └─ Expected null, actual undefined`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      {},
      `(NumberFromString | null <-> Option<number>)
└─ Encoded side transformation failure
   └─ NumberFromString | null
      ├─ NumberFromString
      │  └─ Encoded side transformation failure
      │     └─ Expected string, actual {}
      └─ Expected null, actual {}`
    )
  })

  it("encoding", async () => {
    const schema = S.OptionFromNullOr(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, O.none(), null)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })
})

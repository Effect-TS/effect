import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Option > optionFromNullable", () => {
  it("property tests", () => {
    Util.roundtrip(S.optionFromNullable(S.number))
  })

  it("decoding", async () => {
    const schema = S.optionFromNullable(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, null, O.none())
    await Util.expectDecodeUnknownSuccess(schema, "1", O.some(1))

    expect(O.isOption(S.decodeSync(schema)(null))).toEqual(true)
    expect(O.isOption(S.decodeSync(schema)("1"))).toEqual(true)

    await Util.expectDecodeUnknownFailure(
      schema,
      undefined,
      `(null | NumberFromString <-> Option<number>)
└─ From side transformation failure
   └─ null | NumberFromString
      ├─ Union member
      │  └─ Expected null, actual undefined
      └─ Union member
         └─ NumberFromString
            └─ From side transformation failure
               └─ Expected a string, actual undefined`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      {},
      `(null | NumberFromString <-> Option<number>)
└─ From side transformation failure
   └─ null | NumberFromString
      ├─ Union member
      │  └─ Expected null, actual {}
      └─ Union member
         └─ NumberFromString
            └─ From side transformation failure
               └─ Expected a string, actual {}`
    )
  })

  it("encoding", async () => {
    const schema = S.optionFromNullable(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, O.none(), null)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })
})

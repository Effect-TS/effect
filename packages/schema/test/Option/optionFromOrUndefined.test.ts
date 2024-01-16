import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Option > optionFromOrUndefined", () => {
  it("property tests", () => {
    Util.roundtrip(S.optionFromOrUndefined(S.number))
  })

  it("decoding", async () => {
    const schema = S.optionFromOrUndefined(S.NumberFromString)
    await Util.expectParseSuccess(schema, undefined, O.none())
    await Util.expectParseSuccess(schema, "1", O.some(1))

    expect(O.isOption(S.decodeSync(schema)(undefined))).toEqual(true)
    expect(O.isOption(S.decodeSync(schema)("1"))).toEqual(true)

    await Util.expectParseFailure(
      schema,
      null,
      `(undefined | NumberFromString <-> Option<number>)
└─ From side transformation failure
   └─ undefined | NumberFromString
      ├─ Union member
      │  └─ Expected undefined, actual null
      └─ Union member
         └─ NumberFromString
            └─ From side transformation failure
               └─ Expected a string, actual null`
    )
    await Util.expectParseFailure(
      schema,
      {},
      `(undefined | NumberFromString <-> Option<number>)
└─ From side transformation failure
   └─ undefined | NumberFromString
      ├─ Union member
      │  └─ Expected undefined, actual {}
      └─ Union member
         └─ NumberFromString
            └─ From side transformation failure
               └─ Expected a string, actual {}`
    )
  })

  it("encoding", async () => {
    const schema = S.optionFromOrUndefined(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, O.none(), undefined)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })
})

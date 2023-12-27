import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as O from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Option/optionFromNullable", () => {
  it("property tests", () => {
    Util.roundtrip(S.optionFromNullable(S.number))
  })

  it("decoding", async () => {
    const schema = S.optionFromNullable(S.NumberFromString)
    await Util.expectParseSuccess(schema, null, O.none())
    await Util.expectParseSuccess(schema, "1", O.some(1))

    expect(O.isOption(S.decodeSync(schema)(null))).toEqual(true)
    expect(O.isOption(S.decodeSync(schema)("1"))).toEqual(true)

    await Util.expectParseFailure(
      schema,
      undefined,
      `Union (2 members): null or a string <-> number transformation
├─ Union member: null
│  └─ Expected null, actual undefined
└─ Union member: a string <-> number transformation
   └─ Expected string, actual undefined`
    )
    await Util.expectParseFailure(
      schema,
      {},
      `Union (2 members): null or a string <-> number transformation
├─ Union member: null
│  └─ Expected null, actual {}
└─ Union member: a string <-> number transformation
   └─ Expected string, actual {}`
    )
  })

  it("encoding", async () => {
    const schema = S.optionFromNullable(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, O.none(), null)
    await Util.expectEncodeSuccess(schema, O.some(1), "1")
  })
})

import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { describe, it } from "vitest"

describe("bigint > BigintFromNumber", () => {
  const schema = S.BigintFromNumber

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("Decoder", async () => {
    await Util.expectParseSuccess(schema, 0, 0n)
    await Util.expectParseSuccess(schema, -0, -0n)
    await Util.expectParseSuccess(schema, 1, 1n)

    await Util.expectParseFailure(
      schema,
      1.2,
      `BigintFromNumber
└─ Transformation process failure
   └─ Expected BigintFromNumber, actual 1.2`
    )
    await Util.expectParseFailure(
      schema,
      NaN,
      `BigintFromNumber
└─ Transformation process failure
   └─ Expected BigintFromNumber, actual NaN`
    )
    await Util.expectParseFailure(
      schema,
      Infinity,
      `BigintFromNumber
└─ Transformation process failure
   └─ Expected BigintFromNumber, actual Infinity`
    )
    await Util.expectParseFailure(
      schema,
      -Infinity,
      `BigintFromNumber
└─ Transformation process failure
   └─ Expected BigintFromNumber, actual -Infinity`
    )
  })

  it("Encoder", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1)

    await Util.expectEncodeFailure(
      schema,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      `BigintFromNumber
└─ Transformation process failure
   └─ Expected BigintFromNumber, actual 9007199254740992n`
    )
    await Util.expectEncodeFailure(
      schema,
      BigInt(Number.MIN_SAFE_INTEGER) - 1n,
      `BigintFromNumber
└─ Transformation process failure
   └─ Expected BigintFromNumber, actual -9007199254740992n`
    )
  })
})

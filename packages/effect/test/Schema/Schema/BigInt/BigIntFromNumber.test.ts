import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("BigIntFromNumber", () => {
  const schema = S.BigIntFromNumber

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("Decoder", async () => {
    await Util.expectDecodeUnknownSuccess(schema, 0, 0n)
    await Util.expectDecodeUnknownSuccess(schema, -0, -0n)
    await Util.expectDecodeUnknownSuccess(schema, 1, 1n)

    await Util.expectDecodeUnknownFailure(
      schema,
      1.2,
      `BigintFromNumber
└─ Transformation process failure
   └─ Expected BigintFromNumber, actual 1.2`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      NaN,
      `BigintFromNumber
└─ Transformation process failure
   └─ Expected BigintFromNumber, actual NaN`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Infinity,
      `BigintFromNumber
└─ Transformation process failure
   └─ Expected BigintFromNumber, actual Infinity`
    )
    await Util.expectDecodeUnknownFailure(
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

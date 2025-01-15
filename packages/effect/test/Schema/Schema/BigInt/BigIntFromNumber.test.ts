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
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to decode 1.2 into a bigint`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      NaN,
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to decode NaN into a bigint`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      Infinity,
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to decode Infinity into a bigint`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      -Infinity,
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to decode -Infinity into a bigint`
    )
  })

  it("Encoder", async () => {
    await Util.expectEncodeSuccess(schema, 1n, 1)

    await Util.expectEncodeFailure(
      schema,
      BigInt(Number.MAX_SAFE_INTEGER) + 1n,
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to encode 9007199254740992n into a number`
    )
    await Util.expectEncodeFailure(
      schema,
      BigInt(Number.MIN_SAFE_INTEGER) - 1n,
      `BigIntFromNumber
└─ Transformation process failure
   └─ Unable to encode -9007199254740992n into a number`
    )
  })
})

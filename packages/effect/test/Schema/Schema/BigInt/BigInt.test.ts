import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("BigInt", () => {
  const schema = S.BigInt

  it("property tests", () => {
    Util.assertions.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, "0", 0n)
    await Util.expectDecodeUnknownSuccess(schema, "-0", -0n)
    await Util.expectDecodeUnknownSuccess(schema, "1", 1n)

    await Util.expectDecodeUnknownFailure(
      schema,
      "",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "" into a bigint`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " ",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode " " into a bigint`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "1.2",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "1.2" into a bigint`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "1AB",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "1AB" into a bigint`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "AB1",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "AB1" into a bigint`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "a" into a bigint`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a1",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "a1" into a bigint`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, "1")
  })
})

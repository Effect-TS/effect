import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("BigInt", () => {
  const schema = S.BigInt

  it("property tests", () => {
    Util.roundtrip(schema)
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
   └─ Expected BigInt, actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " ",
      `BigInt
└─ Transformation process failure
   └─ Expected BigInt, actual " "`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "1.2",
      `BigInt
└─ Transformation process failure
   └─ Expected BigInt, actual "1.2"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "1AB",
      `BigInt
└─ Transformation process failure
   └─ Expected BigInt, actual "1AB"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "AB1",
      `BigInt
└─ Transformation process failure
   └─ Expected BigInt, actual "AB1"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `BigInt
└─ Transformation process failure
   └─ Expected BigInt, actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a1",
      `BigInt
└─ Transformation process failure
   └─ Expected BigInt, actual "a1"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, "1")
  })
})

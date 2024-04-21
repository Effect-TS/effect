import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
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
      `bigint
└─ Transformation process failure
   └─ Expected bigint, actual ""`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      " ",
      `bigint
└─ Transformation process failure
   └─ Expected bigint, actual " "`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "1.2",
      `bigint
└─ Transformation process failure
   └─ Expected bigint, actual "1.2"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "1AB",
      `bigint
└─ Transformation process failure
   └─ Expected bigint, actual "1AB"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "AB1",
      `bigint
└─ Transformation process failure
   └─ Expected bigint, actual "AB1"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a",
      `bigint
└─ Transformation process failure
   └─ Expected bigint, actual "a"`
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "a1",
      `bigint
└─ Transformation process failure
   └─ Expected bigint, actual "a1"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, 1n, "1")
  })
})

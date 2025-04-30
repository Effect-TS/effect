import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("BigInt", () => {
  const schema = S.BigInt

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, "0", 0n)
    await Util.assertions.decoding.succeed(schema, "-0", -0n)
    await Util.assertions.decoding.succeed(schema, "1", 1n)

    await Util.assertions.decoding.fail(
      schema,
      "",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "" into a bigint`
    )
    await Util.assertions.decoding.fail(
      schema,
      " ",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode " " into a bigint`
    )
    await Util.assertions.decoding.fail(
      schema,
      "1.2",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "1.2" into a bigint`
    )
    await Util.assertions.decoding.fail(
      schema,
      "1AB",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "1AB" into a bigint`
    )
    await Util.assertions.decoding.fail(
      schema,
      "AB1",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "AB1" into a bigint`
    )
    await Util.assertions.decoding.fail(
      schema,
      "a",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "a" into a bigint`
    )
    await Util.assertions.decoding.fail(
      schema,
      "a1",
      `BigInt
└─ Transformation process failure
   └─ Unable to decode "a1" into a bigint`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, 1n, "1")
  })
})
